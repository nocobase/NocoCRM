#!/usr/bin/env python3
"""One explicitly coordinated diagnostic reset. Not a resource benefit test."""
import argparse
from contextlib import contextmanager, ExitStack
from datetime import datetime, timezone
import difflib
import fcntl
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import tempfile
from db_overlay import atomic_replace
from resource_process import run_worker

ROOT = Path(__file__).resolve().parents[2]
ORIGINAL_DB_SHA = '36023c87a5b58ae46ac9b23b4c2d17eaf80dd4afdc4573d5f8d38ad1584a5551'
IMPORT = "import { probePeakValue } from '../../../tests/resource/peak-observer.js';\n"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def instrument(name, original):
    source = original.decode()
    def replace(old, new):
        nonlocal source
        assert source.count(old) == 1, f'Expected exactly one probe location in {name}: {old}'
        source = source.replace(old, new)
    if name == 'demo.ts':
        replace('  const text = demoContent(language);',
                "  const text = probePeakValue('story.content', demoContent(language));")
        for percent in [35, 65, 90]:
            old = f'  await progress({percent});'
            extra = ', projects' if percent >= 65 else ''
            replace(old, f"  probePeakValue('story-{percent}', {{ companies_, contacts, opportunities, leads, manifest{extra} }});\n" + old)
        replace('value: JSON.stringify(buildDemoMail(text, conversations, at)),',
                "value: probePeakValue('mail.serialized', JSON.stringify(probePeakValue('mail.store', buildDemoMail(text, conversations, at)))),")
        replace('    // A store an interrupted removal left behind gives way to this one.',
                "    probePeakValue('mail.conversations', conversations);\n    // A store an interrupted removal left behind gives way to this one.")
        replace('  });\n\n  // Approvals are raised by whoever owns the deal.',
                "    probePeakValue('story.transactionRoots', { companies_, contacts, opportunities, leads, manifest }, prepared);\n  });\n\n  // Approvals are raised by whoever owns the deal.")
        replace('    return {\n      sf,\n      hworldLead,',
                "    return probePeakValue('story.projectResult', {\n      sf,\n      hworldLead,")
        replace('      expansion,\n    };\n  });', '      expansion,\n    }, prepared);\n  });')
    elif name == 'index.ts':
        replace('            return store[address.toLowerCase()] ?? [];',
                "            probePeakValue('provider.store', store);\n            return probePeakValue('provider.mailbox', store[address.toLowerCase()] ?? []);")
    elif name == 'demo-mail.ts':
        replace('            messages: all.slice(start, end),',
                "            messages: probePeakValue('provider.page', all.slice(start, end)),")
    elif name == 'service.ts':
        replace('    for (const callback of afterCommit) await callback();',
                "    probePeakValue('transaction.result', result, prepared);\n    probePeakValue('transaction.callbacksReady', afterCommit, prepared);\n    for (const callback of afterCommit) await callback();\n    probePeakValue('transaction.release', afterCommit, prepared);")
        old = '''      if (recipientId && recipientId !== actor.id)
        this.afterCommit(actor, () =>
          this.notifyRecord(
            actor,
            entity,
            { ...record, updatedAt: saved?.updatedAt ?? record.updatedAt },
            recipientId,
            event,
          ),
        );'''
        new = old.replace('if (recipientId && recipientId !== actor.id)\n',
                          "if (recipientId && recipientId !== actor.id) {\n        probePeakValue('notification.capture', record, actor);\n") + '\n      }'
        replace(old, new)
    else:
        raise ValueError(name)
    return (IMPORT + source).encode()


@contextmanager
def source_probe(name, output, restorations):
    path = (ROOT / 'server/providers/crm' / name).resolve(strict=True)
    path.relative_to(ROOT)
    original = path.read_bytes()
    changed = instrument(name, original)
    mode = path.stat().st_mode & 0o777
    (output / f'{name}.original').write_bytes(original)
    (output / f'{name}.probe.patch').write_text(''.join(difflib.unified_diff(
        original.decode().splitlines(keepends=True), changed.decode().splitlines(keepends=True),
        fromfile=name, tofile=f'{name} (diagnostic observations only)')))
    try:
        atomic_replace(path, changed, mode)
        yield {'file': str(path.relative_to(ROOT)), 'originalSha256': sha(original),
               'instrumentedSha256': sha(changed)}
    finally:
        atomic_replace(path, original, mode)
        assert sha(path.read_bytes()) == sha(original)
        restorations[name] = {'matchesOriginal': True, 'restoredSha256': sha(original)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--approved-window', action='store_true', help='Only after the coordinator explicitly releases this queued window')
    args = parser.parse_args()
    if not args.approved_window:
        parser.error('Wait for explicit coordinator release; do not enter flock while merely queued')
    assert not (ROOT / '.env').exists() and not any(p.name != '.env.example' for p in ROOT.glob('.env.*'))
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    assert not any(output.iterdir()), 'Choose an empty output directory'
    registry = ROOT / 'node_modules/@nocobase/db/dist/src/collection/registry/registry.js'
    assert sha(registry.read_bytes()) == ORIGINAL_DB_SHA, 'Only the original published DB is allowed'
    def interrupted(signum, frame):
        raise SystemExit(f'Interrupted by signal {signum}')
    signal.signal(signal.SIGTERM, interrupted)
    restorations = {}
    with open('/tmp/demo-reset-resource-benchmark.lock', 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        print(f'Acquired approved diagnostic window at {datetime.now(timezone.utc).isoformat()}', flush=True)
        try:
            with ExitStack() as overlays:
                sources = [overlays.enter_context(source_probe(name, output, restorations))
                           for name in ['demo.ts', 'index.ts', 'demo-mail.ts', 'service.ts']]
                metadata = {
                    'diagnosticOnly': True, 'measuredResets': 1, 'warmupResets': 0,
                    'initialImport': True, 'finalClear': False, 'forcedGC': False,
                    'startedAt': datetime.now(timezone.utc).isoformat(), 'sourceProbes': sources,
                    'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
                    'node': subprocess.check_output(['node', '--version'], text=True).strip(),
                    'registrySha256': sha(registry.read_bytes()), 'lockfileSha256': sha((ROOT / 'pnpm-lock.yaml').read_bytes()),
                    'scriptSha256': {name: sha((ROOT / 'tests/resource' / name).read_bytes()) for name in
                                    ['demo-reset-peak.py', 'demo-reset-peak-worker.ts', 'peak-observer.ts', 'resource_process.py']},
                }
                (output / 'environment.json').write_text(json.dumps(metadata, indent=2) + '\n')
                with tempfile.TemporaryDirectory(prefix='crm-peak-diagnostic-') as directory:
                    env = {k: os.environ[k] for k in ['PATH', 'HOME'] if k in os.environ}
                    env.update({'NODE_ENV': 'test', 'TMPDIR': directory, 'TZ': 'UTC',
                                'NOCOBASE_TEST_DB_DIALECT': 'sqlite', 'CRM_RESET_PROFILE': '1'})
                    with open(output / 'run.log', 'w') as log:
                        receipt = run_worker(['node', '--import', 'tsx', 'tests/resource/demo-reset-peak-worker.ts', str(output)],
                                             cwd=ROOT, env=env, log=log, timeout=180)
                    (output / 'process.json').write_text(json.dumps(receipt, indent=2) + '\n')
                    assert not receipt['timedOut'] and receipt['returnCode'] == 0, receipt
                    assert (output / 'integrity.json').exists() and (output / 'observation.json').exists()
        finally:
            assert sha(registry.read_bytes()) == ORIGINAL_DB_SHA, 'DB must remain unchanged'
            (output / 'restoration.json').write_text(json.dumps({
                'finishedAt': datetime.now(timezone.utc).isoformat(), 'sources': restorations,
                'unchangedRegistrySha256': sha(registry.read_bytes()),
            }, indent=2) + '\n')
            print(f'Releasing diagnostic window at {datetime.now(timezone.utc).isoformat()}', flush=True)


if __name__ == '__main__':
    main()

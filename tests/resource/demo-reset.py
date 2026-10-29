#!/usr/bin/env python3
"""Opt-in full-application resource gate; serializes with other local demo benchmarks."""
import fcntl
import argparse
import hashlib
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import platform
import subprocess
from contextlib import ExitStack
from db_overlay import registry_overlay, atomic_replace
from resource_process import run_worker
import signal
import tempfile

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('output', type=Path)
parser.add_argument('revision', nargs='?')
parser.add_argument('--profile', action='store_true', help='Diagnostic first-reset allocation/CPU/Intl profile; not an acceptance run')
parser.add_argument('--db-overlay', action='store_true', help='Diagnostic upstream DB get() patch; atomic local replacement, restored in finally')
parser.add_argument('--app-candidate', type=Path, help='Pilot-only replacement for CRM demo.ts; restored after the worker')
args = parser.parse_args()
if args.db_overlay and args.app_candidate:
    parser.error('Measure dependency and application candidates separately')
output = args.output.resolve()
revision = args.revision
# This comparison changes only the audited application module, never dependencies.
source = root / 'server/providers/crm/demo-lifecycle.ts'
assert not (root / '.env').exists() and not any(p.name != '.env.example' for p in root.glob('.env.*')), 'Use a clean worktree without local environment files'
def interrupted(signum, frame):
    raise SystemExit(f'Interrupted by signal {signum}')
signal.signal(signal.SIGTERM, interrupted)
output.mkdir(parents=True, exist_ok=True)
with open('/tmp/demo-reset-resource-benchmark.lock', 'a') as lock:
    print('Waiting for shared demo benchmark lock', flush=True)
    fcntl.flock(lock, fcntl.LOCK_EX)
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=root, text=True).strip()
    print(f'Acquired resource lock at {datetime.now(timezone.utc).isoformat()}; expected hold about 5 minutes (worker only)', flush=True)
    assert not any(output.iterdir()), 'Choose an empty output directory; old reports must not satisfy a new run'
    overlays = ExitStack()
    original = source.read_bytes()
    demo_source = root / 'server/providers/crm/demo.ts'
    demo_original = demo_source.read_bytes()
    demo_mode = demo_source.stat().st_mode & 0o777
    candidate = args.app_candidate.read_bytes() if args.app_candidate else None
    if revision:
        revision = git('rev-parse', '--verify', revision + '^{commit}')
        assert subprocess.check_output(['git', 'show', f'{revision}:pnpm-lock.yaml'], cwd=root) == (root / 'pnpm-lock.yaml').read_bytes(), 'Baseline dependencies differ'
        (output / 'source-backup.ts').write_bytes(original)
    try:
        if revision:
            source.write_bytes(subprocess.check_output(['git', 'show', f'{revision}:server/providers/crm/demo-lifecycle.ts'], cwd=root))
        if candidate is not None:
            (output / 'demo-original.ts').write_bytes(demo_original)
            (output / 'demo-candidate.ts').write_bytes(candidate)
            atomic_replace(demo_source, candidate, demo_mode)
        db_metadata = overlays.enter_context(registry_overlay(root, output, args.db_overlay))
        environment = {
            'dbOverlay': db_metadata,
            'appCandidate': args.app_candidate is not None,
            'demoOriginalSha256': hashlib.sha256(demo_original).hexdigest(),
            'demoActiveSha256': hashlib.sha256(demo_source.read_bytes()).hexdigest(),
            'head': git('rev-parse', 'HEAD'), 'sourceRevision': revision or 'working-tree',
            'startedAt': datetime.now(timezone.utc).isoformat(),
            'sourceSha256': hashlib.sha256((root / 'server/providers/crm/demo-lifecycle.ts').read_bytes()).hexdigest(),
            'lockSha256': hashlib.sha256((root / 'pnpm-lock.yaml').read_bytes()).hexdigest(),
            'workerSha256': hashlib.sha256((root / 'tests/resource/demo-reset-worker.ts').read_bytes()).hexdigest(),
            'launcherSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'resourceProcessSha256': hashlib.sha256((root / 'tests/resource/resource_process.py').read_bytes()).hexdigest(),
            'command': ['python3', *os.sys.argv],
            'platform': platform.platform(), 'machine': platform.machine(), 'cpuCount': os.cpu_count(),
            'node': subprocess.check_output(['node', '--version'], text=True).strip(),
            'profile': args.profile, 'sharedHost': True, 'lock': '/tmp/demo-reset-resource-benchmark.lock',
        }
        (output / 'environment.json').write_text(json.dumps(environment, indent=2) + '\n')
        with tempfile.TemporaryDirectory(prefix='crm-resource-') as temp:
            env = {k: os.environ[k] for k in ['PATH', 'HOME'] if k in os.environ}
            env.update({'NODE_ENV': 'test', 'TMPDIR': temp, 'TZ': 'UTC', 'NOCOBASE_TEST_DB_DIALECT': 'sqlite'})
            if args.profile:
                env['CRM_RESET_PROFILE'] = '1'
            with open(output / 'run.log', 'w') as log:
                receipt = run_worker(
                    ['node', '--expose-gc', '--import', 'tsx', 'tests/resource/demo-reset-worker.ts', str(output / 'result.json')],
                    cwd=root, env=env, log=log, timeout=1200,
                )
                receipt['finishedAt'] = datetime.now(timezone.utc).isoformat()
                (output / 'process.json').write_text(json.dumps(receipt, indent=2) + '\n')
                assert not receipt['timedOut'], 'Resource worker exceeded 1200 seconds'
                assert receipt['returnCode'] == 0, f'Worker exited {receipt["returnCode"]}; see {output / "run.log"}'
                assert (output / 'result.json').is_file(), 'Worker exited without completing assertions'
                report = json.loads((output / 'result.json').read_text())
                assert receipt['osMaxRssMiB'] < report['budgets']['osMaxRssMiB'], 'Full-process OS RSS budget exceeded'
        print(f'PASS: {output / "result.json"}', flush=True)
    finally:
        try:
            overlays.close()
        finally:
            if candidate is not None:
                atomic_replace(demo_source, demo_original, demo_mode)
                assert demo_source.read_bytes() == demo_original
                (output / 'app-restoration.json').write_text(json.dumps({
                    'restoredSha256': hashlib.sha256(demo_source.read_bytes()).hexdigest(),
                    'matchesOriginal': True,
                }, indent=2) + '\n')
            if revision:
                source.write_bytes(original)
    print(f'Releasing resource lock at {datetime.now(timezone.utc).isoformat()}', flush=True)

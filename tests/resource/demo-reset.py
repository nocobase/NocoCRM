#!/usr/bin/env python3
"""Opt-in full-application resource gate; serializes with other local demo benchmarks."""
import fcntl
import hashlib
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import platform
import subprocess
import sys
import signal
import tempfile

root = Path(__file__).resolve().parents[2]
output = Path(sys.argv[1]).resolve()
revision = sys.argv[2] if len(sys.argv) > 2 else None
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
    original = source.read_bytes()
    if revision:
        revision = git('rev-parse', '--verify', revision + '^{commit}')
        assert subprocess.check_output(['git', 'show', f'{revision}:pnpm-lock.yaml'], cwd=root) == (root / 'pnpm-lock.yaml').read_bytes(), 'Baseline dependencies differ'
        (output / 'source-backup.ts').write_bytes(original)
    try:
        if revision:
            source.write_bytes(subprocess.check_output(['git', 'show', f'{revision}:server/providers/crm/demo-lifecycle.ts'], cwd=root))
        environment = {
            'head': git('rev-parse', 'HEAD'), 'sourceRevision': revision or 'working-tree',
            'startedAt': datetime.now(timezone.utc).isoformat(),
            'sourceSha256': hashlib.sha256((root / 'server/providers/crm/demo-lifecycle.ts').read_bytes()).hexdigest(),
            'lockSha256': hashlib.sha256((root / 'pnpm-lock.yaml').read_bytes()).hexdigest(),
            'workerSha256': hashlib.sha256((root / 'tests/resource/demo-reset-worker.ts').read_bytes()).hexdigest(),
            'platform': platform.platform(), 'machine': platform.machine(), 'cpuCount': os.cpu_count(),
            'node': subprocess.check_output(['node', '--version'], text=True).strip(),
            'sharedHost': True, 'lock': '/tmp/demo-reset-resource-benchmark.lock',
        }
        (output / 'environment.json').write_text(json.dumps(environment, indent=2) + '\n')
        with tempfile.TemporaryDirectory(prefix='crm-resource-') as temp:
            env = {k: os.environ[k] for k in ['PATH', 'HOME'] if k in os.environ}
            env.update({'NODE_ENV': 'test', 'TMPDIR': temp, 'TZ': 'UTC', 'NOCOBASE_TEST_DB_DIALECT': 'sqlite'})
            with open(output / 'run.log', 'w') as log:
                try:
                    result = subprocess.run(['node', '--expose-gc', '--import', 'tsx', 'tests/resource/demo-reset-worker.ts', str(output / 'result.json')], cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=1200)
                    assert result.returncode == 0, f'Worker exited {result.returncode}; see {output / "run.log"}'
                    assert (output / 'result.json').is_file(), 'Worker exited without completing assertions'
                except subprocess.TimeoutExpired:
                    raise SystemExit('Resource worker exceeded 1200 seconds')
        print(f'PASS: {output / "result.json"}', flush=True)
    finally:
        if revision:
            source.write_bytes(original)

"""Exact diagnostic-only upstream patch. Never changes the pnpm store in place."""
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import tempfile

OLD = b'''    async get(name) {
        return (await this.getResolution(name))?.collection;
    }'''
NEW = b'''    async get(name) {
        const result = await this.getResolutionInternal(name);
        return result ? structuredClone(result.collection) : undefined;
    }'''

def sha(data):
    return hashlib.sha256(data).hexdigest()

def atomic_replace(target, data, mode):
    # A fresh inode breaks pnpm hard links; never truncate the installed file.
    fd, name = tempfile.mkstemp(prefix='.crm-diagnostic-', dir=target.parent)
    try:
        with os.fdopen(fd, 'wb') as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(name, mode)
        os.replace(name, target)
    finally:
        Path(name).unlink(missing_ok=True)

@contextmanager
def registry_overlay(root, output, enabled):
    package = root / 'node_modules/@nocobase/db'
    target = (package / 'dist/src/collection/registry/registry.js').resolve(strict=True)
    # Refuse a symlink escaping this worktree, even if it is writable.
    target.relative_to(root.resolve())
    version = json.loads((package / 'package.json').read_text())['version']
    original = target.read_bytes()
    assert original.count(OLD) == 1, 'Installed get() differs from the reviewed beta.23 body'
    assert version == '1.0.0-beta.23', 'Diagnostic patch only reviewed against beta.23'
    patched = original.replace(OLD, NEW, 1)
    mode = target.stat().st_mode & 0o777
    metadata = {
        'enabled': enabled, 'version': version, 'path': str(target),
        'originalSha256': sha(original), 'patchedSha256': sha(patched),
        'originalMethod': OLD.decode(), 'patchedMethod': NEW.decode(),
        'patchSha256': sha(OLD + b'\n=>\n' + NEW),
        'originalLinkCount': target.stat().st_nlink,
        'diagnosticOnly': True,
    }
    try:
        if enabled:
            (output / 'db-registry-original.js').write_bytes(original)
            atomic_replace(target, patched, mode)
            assert sha(target.read_bytes()) == sha(patched)
        yield metadata
    finally:
        if enabled:
            atomic_replace(target, original, mode)
        assert sha(target.read_bytes()) == sha(original), 'Registry restoration mismatch'
        (output / 'db-restoration.json').write_text(json.dumps({
            'enabled': enabled, 'restoredSha256': sha(target.read_bytes()),
            'matchesOriginal': True,
        }, indent=2) + '\n')

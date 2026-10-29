import json
import os
from pathlib import Path
import tempfile
import unittest
from db_overlay import OLD, NEW, registry_overlay

class RegistryOverlayTest(unittest.TestCase):
    def test_hardlink_is_not_written_and_failure_restores_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'workspace'
            package = root / 'node_modules/@nocobase/db'
            target = package / 'dist/src/collection/registry/registry.js'
            target.parent.mkdir(parents=True)
            (package / 'package.json').write_text(json.dumps({'version': '1.0.0-beta.23'}))
            original = b'export class Registry {\n' + OLD + b'\n}\n'
            store = Path(directory) / 'store.js'
            store.write_bytes(original)
            os.link(store, target)
            output = root / 'output'
            output.mkdir()
            with self.assertRaisesRegex(RuntimeError, 'worker failed'):
                with registry_overlay(root, output, True) as metadata:
                    self.assertEqual(store.read_bytes(), original)
                    self.assertIn(NEW, target.read_bytes())
                    self.assertNotEqual(target.stat().st_ino, store.stat().st_ino)
                    self.assertEqual(metadata['originalLinkCount'], 2)
                    raise RuntimeError('worker failed')
            self.assertEqual(target.read_bytes(), original)
            self.assertEqual(store.read_bytes(), original)
            self.assertTrue(json.loads((output / 'db-restoration.json').read_text())['matchesOriginal'])

    def test_refuses_an_external_symlink(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'workspace'
            package = root / 'node_modules/@nocobase/db'
            package.parent.mkdir(parents=True)
            external = Path(directory) / 'external'
            target = external / 'dist/src/collection/registry/registry.js'
            target.parent.mkdir(parents=True)
            target.write_bytes(OLD)
            package.symlink_to(external, target_is_directory=True)
            with self.assertRaises(ValueError):
                with registry_overlay(root, root, True):
                    self.fail('External target must not be patched')
            self.assertEqual(target.read_bytes(), OLD)

if __name__ == '__main__':
    unittest.main()

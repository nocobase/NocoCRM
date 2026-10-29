import os
from pathlib import Path
import signal
import sys
import tempfile
import unittest
from resource_process import run_worker


class ResourceProcessTest(unittest.TestCase):
    def run_child(self, code, timeout=5):
        with tempfile.TemporaryFile() as log:
            return run_worker([sys.executable, '-c', code], cwd=Path.cwd(), env=os.environ.copy(), log=log, timeout=timeout)

    def test_reports_peak_after_child_releases_memory_and_exits(self):
        result = self.run_child('data = bytearray(32 * 1024 ** 2); data[::4096] = b"x" * 8192; del data')
        self.assertEqual(result['returnCode'], 0)
        self.assertFalse(result['timedOut'])
        self.assertGreater(result['osMaxRssMiB'], 32)

    def test_nonzero_exit_is_not_success(self):
        self.assertEqual(self.run_child('raise SystemExit(7)')['returnCode'], 7)

    def test_signal_exit_is_reported(self):
        result = self.run_child('import os, signal; os.kill(os.getpid(), signal.SIGTERM)')
        self.assertEqual(result['returnCode'], -signal.SIGTERM)

    def test_timeout_reaps_only_its_own_worker(self):
        result = self.run_child('import time; time.sleep(10)', timeout=0.15)
        self.assertTrue(result['timedOut'])
        self.assertEqual(result['returnCode'], -signal.SIGKILL)


if __name__ == '__main__':
    unittest.main()

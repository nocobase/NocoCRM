"""Collect one child process's OS high-water RSS, including startup and teardown."""
import os
import subprocess
import sys
import time


def run_worker(command, *, cwd, env, log, timeout):
    started = time.monotonic()
    child = subprocess.Popen(command, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT)
    timed_out = False
    try:
        while True:
            pid, status, usage = os.wait4(child.pid, os.WNOHANG)
            if pid:
                break
            if time.monotonic() - started >= timeout:
                timed_out = True
                child.kill()  # Only the worker this launcher created.
                _, status, usage = os.wait4(child.pid, 0)
                break
            time.sleep(0.05)
        child.returncode = os.waitstatus_to_exitcode(status)
    except BaseException:
        # Finish our worker before restoring its source/dependency overlays.
        child.kill()
        _, status, _ = os.wait4(child.pid, 0)
        child.returncode = os.waitstatus_to_exitcode(status)
        raise
    return {
        'command': command,
        'returnCode': child.returncode,
        'timedOut': timed_out,
        'elapsedSeconds': time.monotonic() - started,
        'osMaxRssMiB': usage.ru_maxrss / (1024 ** 2 if sys.platform == 'darwin' else 1024),
        'rssScope': 'wait4 rusage for the entire worker process, including imports, boot and teardown',
    }

#!/usr/bin/env python3
"""Run one fixed .NET game in a real POSIX PTY. stdin/stdout carry JSON lines.
No shell, command strings, game paths or working directories come from the visitor.
"""
import argparse
import base64
import errno
import fcntl
import json
import os
import pty
import resource
import select
import signal
import struct
import sys
import termios
import time


def emit(message):
    sys.stdout.write(json.dumps(message, ensure_ascii=True) + '\n')
    sys.stdout.flush()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--game', required=True)
    parser.add_argument('--cwd', required=True)
    parser.add_argument('--cols', type=int, default=100)
    parser.add_argument('--rows', type=int, default=40)
    args = parser.parse_args()
    if not os.path.isabs(args.game) or not os.path.isfile(args.game):
        raise ValueError('Game executable missing')
    os.umask(0o077)
    pid, master = pty.fork()
    if pid == 0:
        os.chdir(args.cwd)
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        resource.setrlimit(resource.RLIMIT_NOFILE, (128, 128))
        env = os.environ.copy()
        env.pop('NO_COLOR', None)
        env.pop('FORCE_COLOR', None)
        env.update(TERM='xterm-256color', LANG='C.UTF-8', LC_ALL='C.UTF-8',
                   DOTNET_EnableDiagnostics='0', DOTNET_GCHeapHardLimit='0x8000000')
        fcntl.ioctl(0, termios.TIOCSWINSZ, struct.pack('HHHH', args.rows, args.cols, 0, 0))
        os.execvpe('dotnet', ['dotnet', args.game], env)
    pending = b''
    status = None
    try:
        while True:
            ready, _, _ = select.select([master, sys.stdin.buffer], [], [], 1)
            if master in ready:
                try:
                    output = os.read(master, 16384)
                except OSError as error:
                    if error.errno == errno.EIO:
                        break
                    raise
                if not output:
                    break
                emit({'type': 'output', 'data': base64.b64encode(output).decode('ascii')})
            if sys.stdin.buffer in ready:
                chunk = os.read(sys.stdin.fileno(), 16384)
                if not chunk:
                    break
                pending += chunk
                if len(pending) > 65536:
                    raise ValueError('Input frame too large')
                while b'\n' in pending:
                    line, pending = pending.split(b'\n', 1)
                    message = json.loads(line)
                    if message.get('type') == 'input' and isinstance(message.get('data'), str):
                        payload = message['data'].encode('utf8')
                        # Short writes are possible; keep this frame intact.
                        while payload:
                            written = os.write(master, payload)
                            payload = payload[written:]
                    elif message.get('type') == 'resize':
                        cols = max(80, min(240, int(message['cols'])))
                        rows = max(30, min(100, int(message['rows'])))
                        fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack('HHHH', rows, cols, 0, 0))
        # After EOF the original process normally has exited already.
        for _ in range(10):
            done, status = os.waitpid(pid, os.WNOHANG)
            if done:
                pid = 0
                break
            time.sleep(0.02)
        emit({'type': 'exit', 'code': os.waitstatus_to_exitcode(status) if pid == 0 else 0})
    finally:
        os.close(master)
        if pid:
            try:
                os.killpg(pid, signal.SIGHUP)
                for _ in range(30):
                    done, _ = os.waitpid(pid, os.WNOHANG)
                    if done:
                        return
                    time.sleep(0.05)
                os.killpg(pid, signal.SIGKILL)
                os.waitpid(pid, 0)
            except ProcessLookupError:
                pass


if __name__ == '__main__':
    try:
        main()
    except (BrokenPipeError, KeyboardInterrupt):
        pass
    except Exception:
        emit({'type': 'error', 'message': 'A sessão do terminal foi encerrada.'})
        sys.exit(1)

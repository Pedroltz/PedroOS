"""Integration checks against the original compiled C# executable, not a mock game."""
import base64
import hashlib
import json
import os
from pathlib import Path
import select
import subprocess
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[2]
GAME = next((ROOT / f'src/Game2091.Native/bin/{configuration}/net10.0/Game2091.Native.dll'
             for configuration in ('Release', 'Debug')
             if (ROOT / f'src/Game2091.Native/bin/{configuration}/net10.0/Game2091.Native.dll').exists()),
            ROOT / 'src/Game2091.Native/bin/Release/net10.0/Game2091.Native.dll')
HELPER = ROOT / 'src/PedroOS.Web/Terminal/pty_host.py'


class NativePTYTests(unittest.TestCase):
    def test_original_sources_and_resources_match_import_manifest(self):
        original = ROOT / 'src/Game2091.Native/Original'
        manifest = json.loads((original / 'source.json').read_text())
        self.assertGreater(len(manifest['files']), 35)
        for filename, expected in manifest['files'].items():
            self.assertEqual(hashlib.sha256((original / filename).read_bytes()).hexdigest(), expected, filename)
        self.assertFalse((original / 'Saves').exists())
        self.assertFalse((original / 'Config/api-keys.json').exists())

    def test_real_console_menu_input_resize_and_process_cleanup(self):
        self.assertTrue(GAME.exists(), 'Build the solution before running this test')
        with tempfile.TemporaryDirectory(prefix='pedroos-pty-') as directory:
            process = subprocess.Popen(['python3', str(HELPER), '--game', str(GAME), '--cwd', directory, '--cols', '100', '--rows', '40'],
                                       stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=0)
            raw = b''
            pending = b''
            child = None

            def send(data):
                process.stdin.write((json.dumps(data) + '\n').encode())
                process.stdin.flush()

            def until(phrase, timeout=15):
                nonlocal raw, pending
                end = time.monotonic() + timeout
                while time.monotonic() < end:
                    readable, _, _ = select.select([process.stdout], [], [], 0.1)
                    if not readable:
                        self.assertIsNone(process.poll(), 'PTY helper ended early')
                        continue
                    chunk = os.read(process.stdout.fileno(), 65536)
                    self.assertTrue(chunk, 'PTY output ended early')
                    pending += chunk
                    while b'\n' in pending:
                        line, pending = pending.split(b'\n', 1)
                        message = json.loads(line)
                        if message['type'] == 'output':
                            output = base64.b64decode(message['data'])
                            raw += output
                            if b'\x1b[6n' in output:
                                send({'type': 'input', 'data': '\x1b[1;1R'})
                        elif message['type'] == 'error':
                            self.fail(message['message'])
                    if phrase.encode() in raw:
                        return
                self.fail('Original C# game did not display: ' + phrase)

            try:
                until('Pressione qualquer tecla')
                self.assertIn(b'\x1b]2091;music:start\x07', raw, 'Original music requests must reach the browser')
                children = Path(f'/proc/{process.pid}/task/{process.pid}/children').read_text().split()
                self.assertEqual(len(children), 1)
                child = int(children[0])
                send({'type': 'resize', 'cols': 120, 'rows': 45})
                send({'type': 'input', 'data': '\r'})
                until('Jogar')
                self.assertIn(b'\x1b[', raw)  # Native console control sequences are preserved.
                self.assertTrue(any(code in raw for code in [b'\x1b[36m', b'\x1b[96m']), 'Console colours must reach xterm')
                # EOF must terminate/reap the child, even while Console.ReadKey is waiting.
                process.stdin.close()
                deadline = time.monotonic() + 6
                while process.poll() is None and time.monotonic() < deadline:
                    readable, _, _ = select.select([process.stdout], [], [], 0.1)
                    if readable:
                        os.read(process.stdout.fileno(), 65536)
                self.assertIsNotNone(process.poll(), 'PTY helper leaked after disconnect')
                self.assertFalse(Path(f'/proc/{child}').exists(), 'Native game process leaked after disconnect')
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait()
                process.stdout.close()
                process.stderr.close()
                if not process.stdin.closed:
                    process.stdin.close()


if __name__ == '__main__':
    unittest.main()

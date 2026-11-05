"""No browser needed: validate Windows-safe launch and fallback frame handling."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('worker', ROOT / 'services/render-worker/worker.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)

class WorkerTests(unittest.TestCase):
    def test_vite_uses_node_entrypoint_without_cmd_shell(self):
        with patch.dict('os.environ', {'NODE_BINARY': r'C:\Program Files\Node\node.exe'}):
            args = worker.vite_command(5178)
            self.assertEqual(args[0], r'C:\Program Files\Node\node.exe')
            self.assertTrue(args[1].endswith('vite/bin/vite.js'))
            self.assertEqual(args[-1], '--strictPort')
            self.assertFalse(any(x.endswith('.cmd') for x in args))

    def test_consecutive_zero_based_frames_replace_stale_directory(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); dest = root / 'frames'; dest.mkdir()
            (dest / 'frame_9999.png').write_bytes(b'stale')
            archive = root / 'frames.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                for i in range(3): z.writestr(f'frame_{i:04d}.png', b'PNG')
            worker.extract_frames(archive, dest, 3)
            self.assertEqual(sorted(p.name for p in dest.iterdir()), [f'frame_{i:04d}.png' for i in range(3)])

    def test_missing_or_unsafe_or_empty_frames_fail(self):
        for names in [['frame_0001.png'], ['../frame_0000.png'], ['frame_0000.png', 'frame_0000.png'], ['frame_0000.png']]:
            with self.subTest(names=names), tempfile.TemporaryDirectory() as folder:
                root = Path(folder)
                with zipfile.ZipFile(root / 'bad.zip', 'w') as z:
                    for name in names: z.writestr(name, b'' if len(names) == 1 and name == 'frame_0000.png' else b'PNG')
                with self.assertRaisesRegex(RuntimeError, 'INVALID_FRAME_SEQUENCE'):
                    worker.extract_frames(root / 'bad.zip', root / 'frames', 1)

if __name__ == '__main__':
    unittest.main()

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

HARNESS = Path(__file__).resolve().parent


class HeadlessLaunch(unittest.TestCase):
    def run_fixture(self, successful):
        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            binary = root / "bin"
            binary.mkdir()
            cli = binary / "claude"
            event = {"type": "result", "subtype": "success", "is_error": not successful,
                     "result": "done" if successful else "You've hit your limit", "usage": {}}
            cli.write_text("#!/usr/bin/env python3\nimport json, sys\nfrom pathlib import Path\n"
                           "Path('../cli-args.json').write_text(json.dumps(sys.argv[1:]))\n"
                           f"print({json.dumps(json.dumps(event))})\n")
            cli.chmod(0o755)
            env = {**os.environ, "PATH": str(binary) + os.pathsep + os.environ["PATH"],
                   "RUNS": str(root / "runs"), "SANDBOX_NOTE": "0", "EVAL_EFFORT": "high"}
            run = subprocess.run(["bash", str(HARNESS / "run-headless.sh"), "rhp-none", "keeling", "test-model"],
                                 env=env, capture_output=True, text=True)
            folder = next((root / "runs").iterdir())
            meta = json.loads((folder / "meta.json").read_text())
            args = json.loads((folder / "cli-args.json").read_text())
            self.assertIn("--strict-mcp-config", args)
            self.assertIn("--disable-slash-commands", args)
            self.assertEqual(json.loads((folder / "mcp.json").read_text()), {"mcpServers": {}})
            self.assertIn("Work only in", (folder / "TASK.md").read_text())
            self.assertEqual(meta["effort"], "high")
            self.assertTrue(meta["transcript"])
            return run, meta

    def test_success_is_collectable(self):
        run, meta = self.run_fixture(True)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(meta["status"], "complete")
        self.assertIn("done", meta)

    def test_error_result_is_not_a_completed_run_even_when_cli_exits_zero(self):
        run, meta = self.run_fixture(False)
        self.assertNotEqual(run.returncode, 0)
        self.assertEqual(meta["status"], "failed")
        self.assertNotIn("done", meta)
        self.assertIn("limit", meta["error"])


if __name__ == "__main__":
    unittest.main()

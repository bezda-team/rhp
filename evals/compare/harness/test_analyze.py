import json
import tempfile
import unittest
from pathlib import Path
from analyze import analyze


class HeadlessAccounting(unittest.TestCase):
    def analyze_rows(self, rows):
        with tempfile.TemporaryDirectory() as root:
            transcript = Path(root) / "transcript.jsonl"
            transcript.write_text("\n".join(json.dumps(row) for row in rows))
            return analyze(transcript)

    def test_stream_without_timestamps_uses_exact_result_duration(self):
        usage = {"input_tokens": 100, "cache_creation_input_tokens": 20,
                 "cache_read_input_tokens": 30, "output_tokens": 40}
        blocks = [
            {"type": "tool_use", "id": "skill", "name": "Skill", "input": {"skill": "rhp"}},
            {"type": "tool_use", "id": "check", "name": "mcp__rhp__rhp_check", "input": {}},
            {"type": "tool_use", "id": "write", "name": "Write", "input": {
                "file_path": "/tmp/example/project/poster.html", "content": "<!doctype html><p>Example</p>"}},
        ]
        report = self.analyze_rows([
            {"type": "assistant", "message": {"id": "message", "model": "claude-sonnet-5-5",
             "usage": usage, "content": blocks}},
            {"type": "result", "is_error": False, "duration_ms": 12345,
             "usage": usage, "total_cost_usd": 0.1234},
        ])
        self.assertEqual(report["wall_seconds"], 12)
        self.assertIsNone(report["learning"]["minutes_before_draft"])
        self.assertEqual(report["totals"]["output_est"], 40)
        self.assertEqual(report["totals"]["input_total"], 150)
        self.assertEqual(report["totals"]["cost_usd"], 0.1234)
        self.assertTrue(report["totals"]["exact"])
        self.assertEqual(report["violations"], [])

    def test_rate_limit_without_assistant_messages_remains_zero_usage(self):
        report = self.analyze_rows([{"type": "result", "is_error": True,
            "duration_ms": 335, "usage": {}, "total_cost_usd": 0}])
        self.assertEqual(report["totals"]["requests"], 0)
        self.assertEqual(report["totals"]["cost_usd"], 0)
        self.assertIsNone(report["learning"]["first_draft_request"])


if __name__ == "__main__":
    unittest.main()

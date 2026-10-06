import assert from "node:assert/strict";
import { test } from "node:test";
import { turnOutcome } from "./codex-accounting.mjs";
test("completed usage survives a recovered connection warning without becoming a failed poster", () => {
  const usage = { input_tokens: 1000, cached_input_tokens: 700, output_tokens: 80, reasoning_output_tokens: 30 };
  const result = turnOutcome([{ type: "error", message: "Reconnecting" }, { type: "turn.completed", usage }]);
  assert.equal(result.success, true);
  assert.equal(result.usage, usage);
  assert.equal(result.error, null);
  assert.deepEqual(result.warnings, ["Reconnecting"]);
});
test("quota failures and incomplete transcripts cannot count as completed runs", () => {
  const failed = turnOutcome([{ type: "turn.failed", error: { message: "Quota exhausted" } }]);
  assert.equal(failed.success, false);
  assert.equal(failed.usage, null);
  assert.equal(failed.error, "Quota exhausted");
  assert.equal(turnOutcome([{ type: "turn.started" }]).success, false);
});

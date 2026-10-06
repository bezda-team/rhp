// A reconnect warning before a completed turn is not a failed experiment.
export function turnOutcome(events) {
  const completed = events.findLast(e => e.type === "turn.completed");
  const failed = events.findLast(e => e.type === "turn.failed" || e.type === "error");
  const success = !!completed && (!failed || events.indexOf(completed) > events.indexOf(failed));
  return {
    success,
    usage: completed?.usage ?? null,
    error: success ? null : failed?.error?.message ?? failed?.message ?? "No completed turn was recorded",
    warnings: events.filter(e => e.type === "error" && e !== (success ? null : failed)).map(e => e.message),
    finalText: events.filter(e => e.type === "item.completed" && e.item?.type === "agent_message").at(-1)?.item.text ?? ""
  };
}

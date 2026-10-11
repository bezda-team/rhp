import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { number } from "./data.js";

const endpoint = document.querySelector('meta[name="article-stats"]')?.content;
const visitorKey = "every-word:visitor";

function visitorId() {
  try {
    const saved = localStorage.getItem(visitorKey);
    if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved)) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem(visitorKey, id);
    return id;
  } catch {
    return null;
  }
}

export function Engagement() {
  const [counts, setCounts] = createSignal(null);
  const [busy, setBusy] = createSignal(false);
  const [message, setMessage] = createSignal("");
  const [failed, setFailed] = createSignal(false);
  let visitor;
  let request;
  let disposed = false;

  const send = async (action, liked) => {
    if (busy()) return;
    setBusy(true);
    setMessage("");
    request = new AbortController();
    const timeout = setTimeout(() => request.abort(), 8000);
    try {
      const response = await fetch(endpoint, {
        method: visitor ? "POST" : "GET",
        headers: visitor ? { "Content-Type": "application/json" } : {},
        body: visitor ? JSON.stringify({ visitor, action, liked }) : undefined,
        signal: request.signal,
      });
      if (!response.ok) throw new Error("Counts unavailable");
      const result = await response.json();
      if (!Number.isSafeInteger(result.visitors) || result.visitors < 0 || !Number.isSafeInteger(result.likes) || result.likes < 0 || typeof result.liked !== "boolean") {
        throw new Error("Invalid counts");
      }
      setCounts(result);
      setFailed(false);
      if (action === "like") setMessage(result.liked ? "You liked this article." : "Your like was removed.");
    } catch {
      if (!disposed) {
        setFailed(true);
        setMessage(counts() ? "Your like could not be saved. Please try again." : "Counts are unavailable. Please try again.");
      }
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  };

  onMount(() => {
    if (!endpoint) return;
    visitor = visitorId();
    send("visit");
  });
  onCleanup(() => { disposed = true; request?.abort(); });

  return (
    <Show when={endpoint}>
      <div class="engagement">
        <span class="visitors" title="Visitors, counted once per browser" aria-label={counts() ? `${number.format(counts().visitors)} ${counts().visitors === 1 ? "visitor" : "visitors"}, counted once per browser` : failed() ? "Visitor count unavailable" : "Visitor count loading"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
          <span aria-hidden="true">{counts() ? number.format(counts().visitors) : failed() ? "?" : "…"}</span>
        </span>
        <button type="button" class="like" aria-pressed={counts()?.liked ?? false} disabled={busy() || !counts() || !visitor}
          aria-label={counts()?.liked ? "Unlike this article" : "Like this article"}
          aria-describedby="article-like-total"
          title={!visitor && counts() ? "Allow browser storage to like this article" : counts()?.liked ? "Unlike this article" : "Like this article"}
          onClick={() => send("like", !counts().liked)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
          <span>{counts() ? number.format(counts().likes) : failed() ? "?" : "…"}</span>
        </button>
        <span id="article-like-total" class="engagement-status">{counts() ? `${number.format(counts().likes)} ${counts().likes === 1 ? "like" : "likes"}` : failed() ? "Like count unavailable" : "Like count loading"}</span>
        <Show when={failed()}><button type="button" class="stats-retry" disabled={busy()} onClick={() => send("visit")}>Retry</button></Show>
        <span class="engagement-status" role="status">{message()}</span>
      </div>
    </Show>
  );
}

// The article's frame: the top bar, the notifications, and the screen the address asks for

import { Switch, Match, For, createEffect } from "solid-js";
import { feed, unseen } from "./feed/store.js";
import { route } from "./route.js";
import { LiveBug, Toasts, DeskSwitch } from "./Live.jsx";
import { Nation } from "./screens/Nation.jsx";
import { Chamber } from "./screens/Chamber.jsx";
import { Race } from "./screens/Race.jsx";

// The rhp site's copy carries <meta name="back-link" content="<url>" data-label="<name>">: a link back to its gallery
const back = document.querySelector('meta[name="back-link"]');

const SECTIONS = [
  ["nation", "#/", "Nation"],
  ["senate", "#/senate", "Senate"],
  ["house", "#/house", "House"],
  ["governors", "#/governors", "Governors"],
];

export function App() {

  // The tab's title keeps the score, so a page in the background still says where things stand
  createEffect(() => {
    const S = feed.control.S, H = feed.control.H;
    const score = S && H ? `Senate ${S.notUp.D + S.won.D}–${S.notUp.R + S.won.R} · House ${H.won.D}–${H.won.R} · ` : "";
    document.title = `${unseen() ? `(${unseen()}) ` : ""}${score}Election Night 2026`;
  });

  return (
    <>
      <header class="top">
        <div class="top-in">
          {back ? <a class="back" href={back.content} aria-label={`Back to the ${back.dataset.label.toLowerCase()}`}>←<b> {back.dataset.label}</b></a> : null}
          <a class="brand" href="#/"><b>Election Night</b><span>Nov. 3, 2026</span></a>
          <nav class="nav" aria-label="Sections">
            <For each={SECTIONS}>
              {([page, href, label]) => <a href={href} aria-current={route().page === page ? "page" : undefined}>{label}</a>}
            </For>
          </nav>
          <DeskSwitch />
          <LiveBug />
        </div>
      </header>
      <Switch fallback={<Nation />}>
        <Match when={route().page === "senate"}><Chamber office="S" /></Match>
        <Match when={route().page === "house"}><Chamber office="H" /></Match>
        <Match when={route().page === "governors"}><Chamber office="G" /></Match>
        <Match when={route().page === "race" && route().id} keyed>{(id) => <Race id={id} />}</Match>
      </Switch>
      <Toasts />
    </>
  );
}

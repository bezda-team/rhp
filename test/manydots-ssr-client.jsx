import { hydrate, render } from "solid-js/web";
import ManyDotsApp from "./manydots-fixture.jsx";
import { ManyDotsIsland } from "./manydots-islands.jsx";
import { HydrationChangeApp, HydrationForeignApp } from "./manydots-hydration-change.jsx";

const root = document.getElementById("root");
const go = () => {
  if (root?.hasAttribute("data-hydration-foreign")) {
    if (location.hash === "#fresh") {
      root.replaceChildren();
      render(() => <HydrationForeignApp updated={true} />, root);
    } else hydrate(() => <HydrationForeignApp updated={true} />, root);
  } else if (root?.hasAttribute("data-hydration-change")) {
    if (location.hash === "#fresh") {
      root.replaceChildren();
      render(() => <HydrationChangeApp updated={true} />, root);
    } else hydrate(() => <HydrationChangeApp updated={true} />, root);
  } else if (document.getElementById("islands")) {
    for (const id of ["island-a", "island-b"]) {
      const mount = document.getElementById("mount-" + id);
      if (location.hash === "#fresh") {
        mount.replaceChildren();
        render(() => <ManyDotsIsland id={id} />, mount);
      } else hydrate(() => <ManyDotsIsland id={id} />, mount, { renderId: id });
    }
  } else if (location.hash === "#fresh") {
    root.replaceChildren();
    render(() => <ManyDotsApp />, root);
  } else hydrate(() => <ManyDotsApp />, root);
};
if (location.search.includes("wait")) window.go = go;
else go();

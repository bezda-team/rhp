// Mounts a React element tree and re-renders it synchronously (flushSync), so an update is drawn in the frame it is made.
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
export const reactMount = (view) => (el, rows, opts) => {
  const box = document.createElement("div"); el.append(box);
  const root = createRoot(box);
  flushSync(() => root.render(view(rows, opts)));
  return {
    update: (rows) => flushSync(() => root.render(view(rows, opts))),
    destroy: () => { root.unmount(); box.remove(); },
  };
};

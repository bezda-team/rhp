// <RhpChart chart={FruitChart} sold={[...]} />: an rhp chart drawn into a React app
import { useLayoutEffect, useRef } from "react";
import { render } from "@bezda/rhp/standalone";

export function RhpChart({ chart, ...props }) {
  const box = useRef(null);
  useLayoutEffect(() => render(() => chart(props), box.current), [chart]);
  return <div ref={box} style={{ maxWidth: 640, margin: "24px auto" }} />;
}

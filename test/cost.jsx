import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { Plot, Chart, Bar, Label, slat } from "../src/index.js";
const N = 1000, T = (window.T = { runs: { plain: 0, store: 0 } });
const init = Array.from({ length: N }, (_, i) => (i * 37) % 100);
const [plain, setPlain] = createSignal(init.slice());
const [st, setSt] = createStore({ v: init.slice() });
T.setPlain = setPlain; T.setSt = setSt; T.plain = plain;
T.mount = () => {
  const t0 = performance.now();
  render(() => (
    <div>
      <Chart scale={[0, 100]}>
        <Plot value={plain()}>{slat({ band: 4 }, (d) => <div><Bar to={(T.runs.plain++, d.value)} /></div>)}</Plot>
      </Chart>
      <Chart scale={[0, 100]}>
        <Plot value={st.v}>{slat({ band: 4 }, (d) => <div><Bar to={(T.runs.store++, d.value)} /></div>)}</Plot>
      </Chart>
    </div>
  ), document.body);
  return performance.now() - t0;
};

// A Solid file that exports two components and no default one. expect: no-component
import { Chart, Plot, Bar, slat } from "@bezda/rhp";

const Fruit = slat((d) => <div><Bar to={d.sold} /></div>);

export function Sold() {
  return <Chart scale={[0, 20]}><Plot sold={[12, 18, 7]}>{Fruit}</Plot></Chart>;
}

export function Kept() {
  return <Chart scale={[0, 20]}><Plot sold={[3, 5, 2]}>{Fruit}</Plot></Chart>;
}

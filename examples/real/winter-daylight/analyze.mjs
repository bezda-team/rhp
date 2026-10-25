import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(here, 'data.json'), 'utf8'));
const minutes = value => value.split(':').slice(0, 2).reduce((sum, n, i) => sum + Number(n) * (i ? 1 : 60), 0);
const clock = value => `${Math.floor(value / 60) % 12 || 12}:${String(value % 60).padStart(2, '0')} ${value >= 720 ? 'p.m.' : 'a.m.'}`;
const results = data.cities.map(city => {
  const rise = minutes(city.sunrise), set = minutes(city.sunset);
  const before = {sunrise: rise - 60, sunset: set - 60};
  const after = {sunrise: rise, sunset: set};
  assert.equal(after.sunset - after.sunrise, before.sunset - before.sunrise);
  assert(minutes(city.civilDawn) < rise && minutes(city.civilDusk) > set);
  assert.equal(after.sunrise - before.sunrise, 60);
  assert.equal(after.sunset - before.sunset, 60);
  const [h, m, s] = city.daylength.split(':').map(Number);
  assert(Math.abs((set - rise) * 60 - (h * 3600 + m * 60 + s)) < 60);
  return {
    city: city.name,
    sunrise: clock(rise), previousWinterSunrise: clock(before.sunrise),
    sunset: clock(set), previousWinterSunset: clock(before.sunset),
    civilDawn: clock(minutes(city.civilDawn)),
    daylightFromRoundedEndpointsMinutes: set - rise,
    sunAfter5pmMinutes: Math.max(0, set - Math.max(17 * 60, rise)),
    previousWinterSunAfter5pmMinutes: Math.max(0, before.sunset - Math.max(17 * 60, before.sunrise)),
  };
});
const vancouver = results.find(city => city.city === 'Vancouver');
assert.equal(vancouver.sunAfter5pmMinutes, 16);
assert.equal(vancouver.daylightFromRoundedEndpointsMinutes, 491);
fs.writeFileSync(path.join(here, 'analysis.json'), JSON.stringify({date: data.date, cities: results}, null, 2) + '\n');
console.table(results.map(({city, sunrise, sunset, sunAfter5pmMinutes}) => ({city, sunrise, sunset, sunAfter5pmMinutes})));

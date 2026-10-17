import assert from 'node:assert/strict';
import {RainSimulation} from './rain-on-glass.js';

for(const width of [1080,374]){
  const simulation=new RainSimulation(width,1350);
  let largestMoving=0,firstRun=null,furthestRun=0;
  const positions=new Set();
  for(let frame=0;frame<3600*30;frame++){
    simulation.step(1/30);
    const moving=simulation.drops.filter(drop=>drop.speed);
    largestMoving=Math.max(largestMoving,moving.length);
    if(moving.length&&firstRun===null)firstRun=simulation.time;
    for(const drop of moving){positions.add(Math.floor(drop.x/width*4));furthestRun=Math.max(furthestRun,drop.speed);}
    assert(moving.length<=simulation.movingLimit);
    assert(simulation.drops.length<=simulation.dropLimit);
    assert(simulation.trails.length<=360);
    for(const drop of simulation.drops)assert(Number.isFinite(drop.x)&&Number.isFinite(drop.y)&&drop.r>0&&drop.r<=14);
  }
  assert(firstRun<1.4,'motion starts promptly');
  assert(positions.size>=3,'runs occur across the glass');
  assert(furthestRun>30,'sliding drops visibly travel');
  assert.equal(largestMoving,simulation.movingLimit);
  simulation.resize(320,1100);
  assert(simulation.drops.filter(drop=>drop.speed).length<=1);
  assert(simulation.drops.length<=14);
  console.log(`PASS ${width}px: one simulated hour, bounded drops and trails, motion across ${positions.size} regions`);
}

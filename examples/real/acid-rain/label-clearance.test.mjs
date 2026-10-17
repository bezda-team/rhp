import assert from 'node:assert/strict';
import {labelCandidates,chooseLabelPositions} from './label-clearance.js';

const own={top:100,bottom:106};
const options=(extra=[],series='power')=>labelCandidates({left:40,right:70,height:16,anchor:103,own,bands:[own,...extra],top:0,bottom:300,series});
assert.equal(chooseLabelPositions([options()])[0].bottom,95,'prefer above even when below is equally close');
assert.equal(chooseLabelPositions([options([{top:72,bottom:96}])])[0].top,111,'move below when above covers a fixed label');
const paired=chooseLabelPositions([options([], 'power'),options([], 'sulfur')]);
assert.equal(paired[0].bottom,95);
assert.equal(paired[1].top,111,'overlapping series keep one label above and one below');
const otherLine={top:80,bottom:86};
const clear=chooseLabelPositions([options([otherLine])])[0];
assert.equal(clear.top,111,'avoid the other line rather than covering it');
console.log('PASS percentage labels prefer above, fall below for collisions, and avoid each other and both lines');

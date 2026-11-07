'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{searchNative}=require('../server/native-search.cjs');
test('a sheet gap escalates search beyond the old five-second cap and stops at its bound',()=>{
 let best={metrics:{sheets:17}};const calls=[];
 const report=searchNative({}, {python:process.execPath,deadline:200000,minimum:16,getBest:()=>best,now:()=>0,onCandidate:r=>{if(r.metrics.sheets<best.metrics.sheets)best=r;},run:(p,o)=>{calls.push([o.axis,o.stages,o.seconds]);return{result:{metrics:{sheets:o.seconds===30?16:17}}};}});
 assert.deepEqual(calls,[['H',2,5],['V',2,5],['H',2,15],['V',2,15],['H',2,30]]);assert.equal(best.metrics.sheets,16);assert.equal(report.trials.length,5);
});
test('a rejected native attempt cannot discard the existing verified incumbent',()=>{
 const best={metrics:{sheets:17}},accepted=[];
 const report=searchNative({}, {python:process.execPath,deadline:200000,minimum:16,getBest:()=>best,now:()=>0,onCandidate:r=>accepted.push(r),run:()=>{throw Error('Invalid physical plan');}});
 assert.equal(best.metrics.sheets,17);assert.equal(accepted.length,0);assert(report.trials.every(t=>t.status==='rejected-or-unavailable'));
});
test('remaining time limits an attempt and preserves five seconds for checkpointing',()=>{
 let time=1000;const calls=[];
 const report=searchNative({}, {python:process.execPath,deadline:8000,minimum:16,getBest:()=>({metrics:{sheets:17}}),now:()=>time,onCandidate:()=>{},run:(p,o)=>{calls.push(o.seconds);time+=o.seconds*1000;return{result:{metrics:{sheets:17}}};}});
 assert.deepEqual(calls,[2]);assert.equal(report.trials[0].seconds,2);
});
test('a lower bound already reached needs no native search',()=>{
 const report=searchNative({}, {python:process.execPath,deadline:200000,minimum:16,getBest:()=>({metrics:{sheets:16}}),onCandidate:()=>{},run:()=>{throw Error('Unexpected search');}});
 assert.equal(report.trials.length,0);
});
test('a missing native installation is explicit and never produces a candidate',()=>{
 const report=searchNative({}, {python:'/no-such-listpro-native-python',deadline:200000,minimum:16,getBest:()=>({metrics:{sheets:17}}),onCandidate:()=>{throw Error('Unexpected candidate');}});
 assert.equal(report.available,false);assert.equal(report.trials[0].status,'unavailable');
});

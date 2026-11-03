'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {buildRawLayout,fromDiagram}=require('../src/deferred-strip-patterns');
const {makeDeferredPlan}=require('../src/deferred-strip-plan');
const {validateDeferred}=require('../src/deferred-strip-validator');
const {deferredProfile,optimizeDeferred,verifyDeferred}=require('../src/deferred-strip-search');
const e=require('../web/examples.json'),reference=require('../benchmarks/order-171-manual-10/reference.json');
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(){const p=copy(e['171'].parameters),l=copy(e['171'].layout),plan=makeDeferredPlan(p,l);return{p,l,plan};}
const check=f=>validateDeferred(f.p,f.l,f.plan,deferredProfile());
test('deferred: manual topology recompiled with original fractional dimensions, exactly 171 on ten sheets',()=>{
 const p=e['171'].parameters,l=buildRawLayout(p,reference.sheets.map(s=>fromDiagram(p,s.topology))),r=verifyDeferred(p,l);
 assert.equal(r.metrics.sheets,10);assert.equal(r.metrics.parts,171);assert.equal(r.metrics.cuts,328);assert.equal(r.metrics.edgeFinishingCuts,5);
 assert.deepEqual(r.sheets.map(s=>s.parts.length),[15,12,9,11,16,16,13,18,18,43]);
 assert.equal(r.metrics.heldRemainderTurns,0);assert.equal(r.metrics.ancestryTurnsMax,4);assert.equal(r.verification.realMachineFeasibility,'unknown');
 const area=p.pieces.reduce((s,a)=>s+a.l*a.w*a.q,0);assert.equal(area,46160513);assert.equal(Math.ceil(area/((p.sheetW-2*p.trim)*(p.sheetH-2*p.trim))),10);
});
test('deferred: last kerf uses original raw stock, not a narrowed inter-part gap',()=>{
 const p={sheetW:2750,sheetH:1830,kerf:5,trim:10,pieces:[{id:1,l:2108,w:968,q:1,grain:true},{id:2,l:562,w:968,q:1,grain:true},{id:3,l:49,w:968,q:1,grain:true}]};
 const row={axis:'V',children:p.pieces.map(a=>({part:{id:a.id,rotated:false},w:a.l,h:a.w}))};
 const s=verifyDeferred(p,buildRawLayout(p,[{axis:'H',children:[row]}]));
 assert.equal(s.sheets[0].parts.find(a=>a.id===3).x+49,2739);assert(s.plan.operations.some(o=>o.materialAxis==='V'&&o.materialPos===2739&&o.kerfUsed===5));
});
for(const [name,mutate,expected]of [
 ['held remainder rotation',f=>{const i=f.plan.operations.findIndex(o=>o.type==='feed'&&o.feedMode==='advance-in-place');const o=f.plan.operations[i];f.plan.operations.splice(i+1,0,{...o,type:'rotate'});f.plan.operations.forEach((o,i)=>o.step=i+1);},/held remainder rotation/],
 ['second turn same blank',f=>{const i=f.plan.operations.findIndex(o=>o.type==='rotate');f.plan.operations.splice(i+1,0,copy(f.plan.operations[i]));f.plan.operations.forEach((o,i)=>o.step=i+1);},/second physical rotation/],
 ['terminal part promoted',f=>{const o=f.plan.operations.find(o=>o.edgeFinish),b=o.outputBlankIds[0];f.plan.operations.push({step:f.plan.operations.length+1,type:'rotate',inputBlankId:b});},/terminal edge promoted/],
 ['reused output id',f=>{const o=f.plan.operations.find(o=>o.type==='cut');o.outputBlankIds[0]=o.inputBlankId;},/reused blank id/],
 ['kerf narrowed',f=>{f.plan.operations.find(o=>o.edgeFinish).kerf=1;},/blade width/],
 ['cut through part',f=>{const o=f.plan.operations.find(o=>o.type==='cut'&&o.phase==='layout');o.start[o.axis==='V'?'x':'y']-=10;},/stroke|coordinates|tree cut/],
 ['rounding original order',f=>{f.p.pieces.find(a=>a.l===573.5).l=574;},/dimensions/],
 ['map label changed',f=>{f.l.sheets[0].parts[0].instance=999;},/map differs/],
 ['operation omitted',f=>{const i=f.plan.operations.findIndex(o=>o.type==='cut');f.plan.operations.splice(i,1);f.plan.operations.forEach((o,i)=>o.step=i+1);},/missing live blank|unfinished/],
 ['wrong material axis',f=>{const o=f.plan.operations.find(o=>o.type==='cut');o.materialAxis=o.materialAxis==='H'?'V':'H';},/material coordinates/],
 ['child rotation counter forged',f=>{f.plan.operations.find(o=>o.type==='cut').outputTurnCounts[0]=1;},/child turn reset/],
 ['false primary end',f=>{f.plan.operations.find(o=>o.type==='endPrimary').stripBlankIds=[];},/primary strip list/],
 ['texture permission removed',f=>{const a=f.l.sheets.flatMap(s=>s.parts).find(a=>a.rotated);f.p.pieces.find(p=>p.id===a.id).grain=true;},/texture/],
])test('deferred rejects '+name,()=>{const f=fixture();mutate(f);assert.throws(()=>check(f),expected);});
test('deferred: profile can prohibit terminal blade overhang',()=>{const f=fixture();assert.throws(()=>validateDeferred(f.p,f.l,f.plan,{...deferredProfile(),allowTerminalBladeOverhang:false}),/terminal sizing/);});
test('deferred: unfinished rip cannot be bypassed by feeding a detached strip',()=>{
 const f=fixture(),i=f.plan.operations.findIndex(o=>o.type==='endPrimary'),feed=f.plan.operations.slice(i+1).find(o=>o.type==='feed'&&o.feedMode==='load-detached');
 f.plan.operations.splice(i-2,0,copy(feed));f.plan.operations.forEach((o,i)=>o.step=i+1);assert.throws(()=>check(f),/unfinished rip series/);
});
test('deferred: historical 11-sheet alternative remains independently valid; exact cover chooses ten',()=>{
 const p=e['171'].parameters,old=require('../web/engine.cjs').verify(p,e['171-legacy'].layout);assert.equal(old.metrics.sheets,11);
 const r=optimizeDeferred(p,[old,e['171'].layout],{permutations:3});assert.equal(r.best.metrics.sheets,10);assert(r.stats.coverNodes>0);assert(r.stats.accepted>1);
});
test('deferred: general search on varied random orders, up to 200 copies, independently replayed',()=>{
 let seed=21;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<12;i++){
  const p={sheetW:1200,sheetH:800,kerf:5,trim:10,pieces:Array.from({length:5},(_,j)=>({id:j+1,l:50+Math.floor(rnd()*340),w:35+Math.floor(rnd()*210),q:i===11?40:1+Math.floor(rnd()*4),grain:j%2===0}))};
  const baseline=require('../src/adaptive-held-strip').searchAdaptive(p,{axis:i%2?'H':'V',iterations:1}).best;
  const r=optimizeDeferred(p,[baseline],{permutations:3});assert(r.best,'random order '+i);assert.equal(r.best.metrics.parts,p.pieces.reduce((s,a)=>s+a.q,0));
  assert.equal(r.best.metrics.heldRemainderTurns,0);
 }
});

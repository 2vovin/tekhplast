'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {searchIndustrial,objective}=require('../src/industrial');
const {rebuildStrip,rebuildLayout}=require('../src/strip-dp');
const {buildGrid,groupedCandidate}=require('../src/strip-blocks');
const {random}=require('../src/strip-candidates');
const {validate}=require('../src/validator');
const {makeStagedPlan}=require('../src/staged-plan');
const {validateStaged,assessStaged}=require('../src/staged-validator');
const p=require('../benchmarks/manual-26-no-rotation.json');
const old=require('../benchmarks/manual-26-staged.json');
const saved=require('../benchmarks/manual-26-brain-1.1.json');
const profile=require('../profiles/abstract-staged-v-saw-v1.json');
const clone=a=>JSON.parse(JSON.stringify(a));
test('Brain 1.1 control: better remnant, fewer cuts and operations',()=>{
 const checked=validateStaged(p,saved,saved.plan,profile);
 assert.equal(checked.geometryValid,true);assert.equal(checked.stagedPlanValid,true);assert.equal(checked.machineProfileValid,true);
 assert.equal(saved.sheets.length,1);assert.equal(saved.partCount,26);
 assert.equal(checked.metrics.cuts,42);assert.equal(checked.metrics.operations,102);
 assert.equal(checked.metrics.cutLength,32775);assert.equal(checked.metrics.turns,17);
 assert(saved.metrics.largestWaste>old.metrics.largestWaste);
 assert(saved.metrics.cuts<old.metrics.cuts);assert(saved.metrics.operations<old.metrics.operations);
 assert(saved.sheets.every(sh=>sh.parts.every(a=>a.rotated===false)));
 for(const b of checked.blanks){assert.equal(b.initialTurnCount,0);assert(b.turnCount<=1);}
});
test('objective explicitly prioritizes cuts and operations before turns and stages',()=>{
 const g={sheets:1,largestWaste:100};
 assert.deepEqual(objective(g,{cuts:10,operations:30,turns:5,cutLength:900,stages:4}),[1,-100,10,30,5,900,4]);
});
for(let seed=1;seed<=1100;seed++)test('Brain 1.1 randomized independent replay '+seed,()=>{
 let z=seed;const rng=()=>((z=(Math.imul(z,1664525)+1013904223)>>>0)/4294967296);
 const order={sheetW:500,sheetH:400,trim:10,kerf:5,pieces:Array.from({length:1+seed%7},(_,i)=>({id:i+1,l:20+Math.floor(rng()*160),w:20+Math.floor(rng()*130),q:1+seed%2,grain:rng()<0.7}))};
 const result=searchIndustrial(order,{profile,seed,iterations:24,dpStates:256});
 const check=validateStaged(order,result,result.plan,profile);
 assert(check.geometryValid&&check.stagedPlanValid&&check.machineProfileValid);
 assert.equal(check.metrics.parts,order.pieces.reduce((n,a)=>n+a.q,0));
 if(seed<=20){const twice=searchIndustrial(order,{profile,seed,iterations:24,dpStates:256});delete result.search.elapsedMs;delete twice.search.elapsedMs;assert.deepEqual(result,twice);}
});
test('bounded DP retains a checked incumbent even on exhaustion',()=>{
 const candidates=rebuildLayout(p,old,profile,{maxStates:1});
 assert(candidates.stats.exhausted);assert(candidates.stats.states<=1);
 assert(candidates.variants.length>0);
 for(const candidate of candidates.variants){
  validate(p,candidate);
  validateStaged(p,candidate,makeStagedPlan(p,candidate,profile),profile);
 }
});
test('strip DP preserves exact material positions and instances',()=>{
 const r=rebuildLayout(p,old,profile,{maxStates:16000});
 const normalize=s=>s.sheets.flatMap(sh=>sh.parts).map(a=>JSON.stringify([a.id,a.instance,a.x,a.y,a.w,a.h,a.rotated])).sort();
 for(const s of r.variants){assert.deepEqual(normalize(s),normalize(old));validate(p,s);}
 assert(r.stats.transitions>0);assert.equal(r.stats.exhausted,false);
});
test('grid grouping preserves counts for every row/column shape',()=>{
 const jobs=Array.from({length:5},(_,i)=>({id:7,instance:i+1,l:30,w:20,grain:true}));
 for(const columns of [1,2,3,4,5])for(const columnFirst of [false,true]){
  const grid=buildGrid(jobs,columns,5,columnFirst),ids=[];
  function visit(n){if(n.kind==='cut'){visit(n.first);visit(n.second);}else if(n.kind==='part')ids.push(n.part.instance);}
  visit(grid.tree);assert.deepEqual(ids.sort((a,b)=>a-b),[1,2,3,4,5]);
 }
});
test('group candidate never drops an instance when dissolving oversized blocks',()=>{
 const order={sheetW:300,sheetH:200,trim:10,kerf:5,pieces:[{id:1,l:120,w:80,q:9,grain:true}]};
 const jobs=Array.from({length:9},(_,i)=>({id:1,instance:i+1,l:120,w:80,grain:true}));
 let checked=0;
 for(let seed=1;seed<=30;seed++){const s=groupedCandidate(order,jobs,random(seed),seed);if(s){validate(order,s);checked++;}}
 assert(checked>0);
});
test('no profile and invalid budgets cannot yield a technology badge',()=>{
 assert.throws(()=>searchIndustrial(p,{iterations:1}),/profile/);
 for(const iterations of [0,-1,1.5])assert.throws(()=>searchIndustrial(p,{profile,iterations}),/budget/);
 assert.throws(()=>rebuildStrip({x:0,y:0,w:10,h:10},[],5,profile,{maxStates:0}),/budget/);
});
test('resumption revalidates geometry and never trusts saved badges',()=>{
 const order={sheetW:400,sheetH:300,trim:10,kerf:5,pieces:[{id:1,l:100,w:80,q:3,grain:true}]};
 const first=searchIndustrial(order,{profile,seed:1,iterations:24,dpStates:256});
 const bad=clone(first);bad.sheets[0].parts[0].w++;
 assert.throws(()=>searchIndustrial(order,{profile,iterations:2,previous:bad}));
 const next=searchIndustrial(order,{profile,seed:2,iterations:4,previous:first,dpStates:256});
 assert(next.sheets.length<=first.sheets.length);assert(validateStaged(order,next,next.plan,profile).machineProfileValid);
});
test('double-turn attack still rejected on Brain 1.1 plan',()=>{
 const plan=clone(saved.plan),i=plan.operations.findIndex(a=>a.type==='rotate'),op=clone(plan.operations[i]);
 plan.operations.splice(i+1,0,op);plan.operations.forEach((a,j)=>a.step=j+1);
 assert.equal(assessStaged(p,saved,plan,profile).stagedPlanValid,false);
});
test('strict original-sheet rotation prohibition remains compatible',()=>{
 const strict={...profile,id:'brain-1.1-strict',allowSheetRotation:false,sheetRotationAllowed:false,maxSheetTurns:0};
 assert(validateStaged(p,saved,{...saved.plan,profileId:strict.id},strict).machineProfileValid);
});
test('zero trim and zero kerf use unchanged material orientation',()=>{
 const order={sheetW:200,sheetH:100,trim:0,kerf:0,pieces:[{id:1,l:100,w:100,q:2,grain:true}]};
 const pr={...profile,kerf:0};
 const s=searchIndustrial(order,{profile:pr,seed:1,iterations:24,dpStates:64});
 assert.equal(validateStaged(order,s,s.plan,pr).metrics.parts,2);
});

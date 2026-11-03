'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {techProfile}=require('../src/bazis-10-tech-profile');
const {analyzeAncestryTurns,validateAncestryTurns}=require('../src/ancestry-validator');
const {optimizeTechnology}=require('../src/brain21-search');
const {sortStrips}=require('../src/strip-ordering');
const {schedulePlan}=require('../src/stop-scheduler');
const {makeExamPlan}=require('../src/exam-plan');
const {collect}=require('../src/pss-waste-local');
const {exportTechnology}=require('../src/brain21-artifacts');
const {random}=require('../src/recursive-strip');
const p=require('../benchmarks/bazis-26-corrected.json'),copy=x=>JSON.parse(JSON.stringify(x));
const originals=['balanced','fewest-cuts','low-turns','best-remnant'].map(n=>require('../benchmarks/brain2/'+n+'/result.json'));
test('Brain 2.0 real ancestry maxima: 8,6,4,6; only 44/13 passes four',()=>{
 assert.deepEqual(originals.map(s=>analyzeAncestryTurns(p,s,s.plan,techProfile()).metrics.ancestryTurnsMax),[8,6,4,6]);
 assert.deepEqual(originals.map(s=>analyzeAncestryTurns(p,s,s.plan,techProfile()).technologyProfileValid),[false,false,true,false]);
 for(const s of originals)assert.equal(validateAncestryTurns(p,s,s.plan,techProfile(null)).metrics.localTurnsMax,1);
});
function fiveTurnFixture(){
 const input={sheetW:400,sheetH:400,trim:10,kerf:5,pieces:[{id:1,l:120,w:180,q:1,grain:true}]};
 const waste=r=>({kind:'waste',rect:r});
 function chain(r,i){
  const axes=['H','V','H','V','H'],sizes=[330,300,250,120,180];
  if(i===5)return {kind:'part',rect:r,part:{id:1,instance:1,rotated:false}};
  const v=axes[i]==='V',size=sizes[i],pos=(v?r.x:r.y)+size;
  return {kind:'cut',rect:r,axis:axes[i],pos,kerf:5,
   first:chain(v?{...r,w:size}:{...r,h:size},i+1),
   second:waste(v?{...r,x:pos+5,w:r.w-size-5}:{...r,y:pos+5,h:r.h-size-5})};
 }
 const root={x:10,y:10,w:380,h:380},strip={...root,w:370},end={...root,x:385,w:5};
 const layout=collect({sheets:[{tree:{kind:'cut',rect:root,axis:'V',pos:380,kerf:5,first:chain(strip,0),second:waste(end)},primaryStrips:[{index:1,rect:strip,path:'r/0'},{index:2,rect:end,path:'r/1'}]}]});
 return {input,layout,plan:makeExamPlan(input,layout,techProfile().baseProfile)};
}
test('five inherited rotations despite one per blank; length stays smaller than width',()=>{
 const {input,layout,plan}=fiveTurnFixture(),v=validateAncestryTurns(input,layout,plan,techProfile(null));
 assert.equal(v.metrics.ancestryTurnsMax,5);assert.equal(v.metrics.localTurnsMax,1);
 assert.equal(v.parts[0].rotationSteps.length,5);
 assert.throws(()=>validateAncestryTurns(input,layout,plan,techProfile(4)),/Ancestry turn limit/);
 assert.equal(layout.sheets[0].parts[0].w,120);assert.equal(layout.sheets[0].parts[0].h,180);
 const bad=copy(layout);bad.sheets[0].parts[0].rotated=true;assert.throws(()=>validateAncestryTurns(input,bad,plan,techProfile(null)));
});
test('rotation traces inherit ancestors and siblings do not accumulate each other',()=>{
 const s=originals[2],a=validateAncestryTurns(p,s,s.plan,techProfile());
 assert.equal(a.metrics.totalHandlingTurns,13);assert.equal(a.metrics.ancestryTurnsMax,4);
 assert(a.parts.reduce((n,p)=>n+p.ancestryTurns,0)>a.metrics.totalHandlingTurns);
 for(const part of a.parts){assert.equal(new Set(part.rotationSteps).size,part.ancestryTurns);assert.equal(part.blankPath.at(-1),part.blankId);}
});
test('budget/depth and claimed metrics cannot alter technological acceptance',()=>{
 const s=copy(originals[0]);s.search={solverDepth:1,iterations:1};s.metrics.ancestryTurnsMax=0;
 assert.throws(()=>validateAncestryTurns(p,s,s.plan,techProfile(4)),/Ancestry turn limit/);
 const a=analyzeAncestryTurns(p,s,s.plan,techProfile(null));assert.equal(a.metrics.ancestryTurnsMax,8);
 assert.equal(a.metrics.totalHandlingTurns,16);assert.notEqual(a.metrics.operations,a.metrics.stripLevelMax);
});
test('one initial stop setting plus actual changes; reset policy is explicit',()=>{
 const s=originals[2],a=validateAncestryTurns(p,s,s.plan,techProfile());
 assert.equal(a.metrics.sizeSettings,35);assert.equal(a.metrics.distinctSettings,25);
 assert.equal(a.settings.filter(x=>x.changed).length,35);
 const b=validateAncestryTurns(p,s,s.plan,techProfile(4,{settingPersistence:'per-blank'}));
 assert(b.metrics.sizeSettings>=a.metrics.sizeSettings);
 assert.throws(()=>validateAncestryTurns(p,s,s.plan,techProfile(4,{initialLoadingTurns:1})));
});
for(const mutate of [
 s=>s.plan.operations.find(o=>o.type==='cut').kerf--,
 s=>{const o=s.plan.operations.find(o=>o.type==='cut'&&o.phase==='layout');o.inputBlankId='s0/raw';},
 s=>s.plan.operations.find(o=>o.type==='rotate').turnCountBefore=1,
 s=>s.plan.operations.find(o=>o.type==='cut').outputTurnCounts=[1,0],
 s=>{const o=s.plan.operations.find(o=>o.type==='cut');o.outputBlankIds[0]=o.inputBlankId;},
 s=>s.plan.operations.find(o=>o.type==='endPrimary').stripBlankIds.push('s0/raw')
])test('independent replay rejects physical corruption '+mutate.toString(),()=>{const s=copy(originals[2]);mutate(s);assert.throws(()=>validateAncestryTurns(p,s,s.plan,techProfile()));});
for(const sorting of ['original','size-desc','size-asc','utilization','narrow-centre'])for(const strategy of ['original','size-desc','size-asc','utilization','settings'])
 test('all-level sorting and dependency scheduling '+sorting+'/'+strategy,()=>{
 const before=JSON.stringify(originals[2]),layout=sortStrips(originals[2],5,sorting),plan=makeExamPlan(p,layout,techProfile().baseProfile);
 const result=schedulePlan(plan,layout,{strategy,lookahead:2}),a=validateAncestryTurns(p,layout,result.plan,techProfile());
 assert.equal(a.metrics.parts,26);assert.equal(a.metrics.ancestryTurnsMax,4);assert.equal(a.metrics.cuts,44);
 assert.equal(JSON.stringify(originals[2]),before);
 if(strategy==='settings'&&sorting==='original')assert.equal(a.metrics.sizeSettings,31);
});
test('new saved profiles replay and all-level maps exist',()=>{
 for(const key of ['4','unlimited']){
  const s=require('../benchmarks/brain21/'+key+'/result.json'),a=validateAncestryTurns(p,s,s.plan,s.technologyProfile);
  assert.equal(a.metrics.sheets,1);assert.equal(a.metrics.parts,26);
  assert.equal(a.metrics.cuts,key==='4'?43:41);if(key==='4')assert(a.metrics.ancestryTurnsMax<=4);
  const files=exportTechnology(s);assert(files['levels/index.json']);assert(files['ancestry.html']);assert(files['operations.html'].includes('inherited path turns'));
 }
});
test('published 43-cut profile cannot be relabelled zero-turn',()=>{
 const s=require('../benchmarks/brain21/4/result.json');
 assert.throws(()=>validateAncestryTurns(p,s,s.plan,techProfile(0)),/Ancestry turn limit/);
});
test('short deterministic search retains a feasible revalidated incumbent',()=>{
 const a=optimizeTechnology(p,techProfile(),{iterations:30,postprocessLimit:2,initialLayouts:originals}),b=optimizeTechnology(p,techProfile(),{iterations:30,postprocessLimit:2,initialLayouts:originals});
 assert.deepEqual(a.best.plan,b.best.plan);assert.equal(a.best.metrics.sheets,1);
 assert(a.best.metrics.ancestryTurnsMax<=4);assert(a.search.solverDepth<=2);
});
test('invalid controls are rejected',()=>{
 for(const opts of [{iterations:-1},{iterations:0,postprocessLimit:-1}])assert.throws(()=>optimizeTechnology(p,techProfile(),opts));
 assert.throws(()=>techProfile(-1));
 assert.throws(()=>schedulePlan(originals[2].plan,originals[2],{lookahead:0}));
});
for(let seed=1;seed<=1000;seed++)test('random ancestry/sorting replay '+seed,()=>{
 const rng=random(seed),input={sheetW:600,sheetH:500,trim:6,kerf:3,pieces:Array.from({length:1+seed%8},(_,i)=>({id:i+1,l:30+Math.floor(rng()*200),w:40+Math.floor(rng()*160),q:1+seed%2,grain:seed%3!==0}))};
 const result=optimizeTechnology(input,techProfile(seed%2?4:null),{seed,iterations:2,postprocessLimit:seed%10===0?1:0});
 const a=validateAncestryTurns(input,result.best,result.best.plan,result.best.technologyProfile);
 assert.equal(a.metrics.parts,input.pieces.reduce((n,p)=>n+p.q,0));
 if(seed%2)assert(a.metrics.ancestryTurnsMax<=4);
});
module.exports={fiveTurnFixture};

test('extra valid feed changes operations, not levels, ancestry or persistent settings',()=>{
 const s=copy(originals[2]),i=s.plan.operations.findIndex(o=>o.type==='feed');
 s.plan.operations.splice(i,0,copy(s.plan.operations[i]));s.plan.operations.forEach((o,j)=>o.step=j+1);
 const a=validateAncestryTurns(p,s,s.plan,techProfile());
 assert.equal(a.metrics.operations,103);assert.equal(a.metrics.ancestryTurnsMax,4);assert.equal(a.metrics.stripLevelMax,5);assert.equal(a.metrics.sizeSettings,35);
});
test('parallel column cuts do not increment strip level per operation',()=>{
 const input={sheetW:600,sheetH:1200,trim:10,kerf:5,pieces:[{id:1,l:100,w:80,q:10,grain:true}]};
 const s=optimizeTechnology(input,techProfile(),{iterations:0,postprocessLimit:0}).best;
 assert.equal(s.metrics.ancestryTurnsMax,1);assert.equal(s.metrics.stripLevelMax,2);assert(s.metrics.cuts>10);
});

test('scheduler computation budget is enforced independently of technology',()=>{
 const s=schedulePlan(originals[2].plan,originals[2],{strategy:'settings',lookahead:4,nodeBudget:1});
 assert(s.search.searchNodes<=1);assert.equal(s.search.exhausted,true);
 assert.equal(validateAncestryTurns(p,originals[2],s.plan,techProfile()).metrics.ancestryTurnsMax,4);
});
test('bounded shelf construction preserves all instances within three turns',()=>{
 const {shelfTrial}=require('../src/brain21-shelves'),{checkInput}=require('../src/core');
 for(let seed=1;seed<=10;seed++){
  const layout=shelfTrial(p,checkInput(p).jobs,random(seed));assert(layout);
  const plan=makeExamPlan(p,layout,techProfile().baseProfile);
  const a=validateAncestryTurns(p,layout,plan,techProfile(3));assert.equal(a.metrics.parts,26);assert(a.metrics.ancestryTurnsMax<=3);
 }
});

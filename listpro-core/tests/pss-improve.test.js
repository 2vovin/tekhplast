'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {searchPSS13}=require('../src/pss-improve');
const {patternDP}=require('../src/pss-pattern-dp');
const {familyJobs,enumerateAnchors}=require('../src/pss-tail-allocation');
const {checkInput}=require('../src/core');
const {validate}=require('../src/validator');
const {validatePSS,assessPSS}=require('../src/pss-validator');
const {rng}=require('../src/pss-candidates');
const profile=require('../profiles/pss-anchored-single-axis-v1.json');
const p=require('../benchmarks/manual-26-no-rotation.json');
const previous=require('../benchmarks/manual-26-pss.json');
const saved=require('../benchmarks/manual-26-pss-1.3.json');
const old=require('../benchmarks/manual-26-brain-1.1.json');
const clone=a=>JSON.parse(JSON.stringify(a));
const small={baselineIterations:8,anchorLimit:64,maxPatterns:8,dpStates:256,frontier:8,allocationStates:80,subsetLimit:300,lnsIterations:4};
const score=m=>[m.sheets,-m.largestWaste,m.cuts,m.turns,m.cutLength,m.operations];
const notWorse=(a,b)=>a.every((x,i)=>x===b[i])||a.some((x,i)=>x<b[i]&&a.slice(0,i).every((y,j)=>y===b[j]));
test('PSS 1.3 saved order, all physical operations and objective are independently verified',()=>{
 assert.deepEqual(saved.parameters,p);
 const r=validatePSS(p,saved,saved.plan,profile);
 assert.equal(r.panelSawStagedValid,true);assert.equal(r.metrics.parts,26);
 assert(notWorse(score(r.metrics),score(validatePSS(p,previous,previous.plan,profile).metrics)));
 assert.equal(r.metrics.sheets,2); // Observed regression, NOT an impossibility assertion.
 assert.equal(r.metrics.cuts,50);assert.equal(r.metrics.largestWaste,4501470);
 assert(saved.search.maxDestroyedStrips>=3);assert(saved.search.maxDestroyedParts>=10);
 assert(saved.search.crossStripMoves>0);assert(saved.search.oneSheetAttempts>=100);
 for(const sh of saved.sheets)for(const strip of sh.primaryStrips){
  const a=sh.parts.find(a=>a.id===strip.anchor.id&&a.instance===strip.anchor.instance);
  assert(a);assert.equal(sh.axis==='V'?a.w:a.h,sh.axis==='V'?strip.rect.w:strip.rect.h);
 }
});
test('PSS 1.3 cannot launder the old main-remainder turn at step 9',()=>{
 const r=assessPSS(p,old,old.plan,profile);
 assert(r.violations.some(a=>a.step===9&&a.code==='ROTATE_PRIMARY_REMAINDER'));
 assert.throws(()=>searchPSS13(p,{profile,previous:old,...small}));
});
test('resuming preserves the best replayed objective and input is immutable',()=>{
 const copy=clone(saved),before=JSON.stringify(copy);
 const result=searchPSS13(p,{profile,previous:copy,...small,lnsIterations:0});
 assert(notWorse(score(result.metrics),score(saved.metrics)));
 assert.equal(JSON.stringify(copy),before);validatePSS(p,result,result.plan,profile);
});
test('a corrupted saved plan is rejected even if badges claim valid',()=>{
 const bad=clone(saved);bad.plan.operations.find(a=>a.type==='cut').kerf=0;
 assert.throws(()=>searchPSS13(p,{profile,previous:bad,...small}));
});
test('child counter tampering and forged working role fail independent replay',()=>{
 for(const mutate of [
  s=>{s.plan.operations.find(a=>a.type==='cut').outputTurnCounts=[1,0];},
  s=>{s.plan.operations.find(a=>a.type==='cut').inputRole='DETACHED_PRIMARY_STRIP';},
  s=>{s.sheets[0].parts[0].rotated=true;}
 ]){const s=clone(saved);mutate(s);assert.throws(()=>validatePSS(p,s,s.plan,profile));}
});
test('primary widths always belong to individual anchors, never grouped sums',()=>{
 const order={sheetW:1800,sheetH:1200,trim:10,kerf:5,pieces:[{id:1,l:874,w:400,q:2,grain:true},{id:2,l:875,w:350,q:2,grain:true}]};
 const families=familyJobs(checkInput(order).jobs);
 for(const axis of ['V','H'])for(const c of enumerateAnchors(order,families,axis).patterns)
  for(const a of c.anchors)assert.equal(a.w,axis==='V'?families[a.type].w:families[a.type].h);
});
test('tiny budgets retain a validated fallback, not a partial order',()=>{
 const s=searchPSS13(p,{profile,previous,...small,dpStates:1,subsetLimit:1,allocationStates:1,lnsIterations:1});
 validatePSS(p,s,s.plan,profile);assert(notWorse(score(s.metrics),score(previous.metrics)));
});
test('budgets and equipment are validated',()=>{
 for(const options of [{lnsIterations:-1},{frontier:0},{subsetLimit:NaN},{dpStates:1.1}])
  assert.throws(()=>searchPSS13(p,{profile,...options}));
 assert.throws(()=>searchPSS13(p,{profile:{...profile,mode:'FORMAT_SAW'}}));
});
test('strict no-sheet-turn profile remains enforced',()=>{
 const q={sheetW:800,sheetH:600,trim:10,kerf:5,pieces:[{id:1,l:300,w:150,q:4,grain:true}]};
 const pr={...profile,maxSheetTurns:0,allowedPrimaryAxes:['V']};
 const s=searchPSS13(q,{profile:pr,...small});
 const roots=new Set(s.plan.operations.filter(a=>a.type==='load').map(a=>a.blankId));
 assert(!s.plan.operations.some(a=>a.type==='rotate'&&roots.has(a.inputBlankId)));
 validatePSS(q,s,s.plan,pr);
});
test('full untrimmed single part and zero kerf are valid edge cases',()=>{
 for(const k of [0,5]){
  const q={sheetW:500,sheetH:300,trim:0,kerf:k,pieces:[{id:'whole',l:500,w:300,q:1,grain:true}]};
  const s=searchPSS13(q,{profile,...small});assert.equal(s.metrics.cuts,0);validatePSS(q,s,s.plan,profile);
 }
});
// Independent exhaustive slicing oracle for four DISTINCT leaves.
// No optimizer, materializer or replay helpers participate in oracle recursion.
function oracle(items,k){
 const memo=new Map();
 function solve(mask){
  if(memo.has(mask))return memo.get(mask);
  const out=[];
  if((mask&(mask-1))===0){const i=Math.log2(mask);out.push([items[i].w,items[i].h]);}
  else for(let a=(mask-1)&mask;a;a=(a-1)&mask){
   const b=mask^a;if(a>b)continue;
   for(const x of solve(a))for(const y of solve(b)){
    if(x[1]===y[1]||Math.abs(x[1]-y[1])>=k)out.push([x[0]+y[0]+k,Math.max(x[1],y[1])]);
    if(x[0]===y[0]||Math.abs(x[0]-y[0])>=k)out.push([Math.max(x[0],y[0]),x[1]+y[1]+k]);
   }
  }
  const unique=[...new Map(out.map(a=>[a.join(','),a])).values()];memo.set(mask,unique);return unique;
 }
 return solve((1<<items.length)-1);
}
for(let seed=1;seed<=40;seed++)test('count DP agrees with independent tiny slicing oracle '+seed,()=>{
 const random=rng(seed),k=1+seed%4,items=Array.from({length:4},()=>({w:5+Math.floor(random()*15),h:5+Math.floor(random()*15)})),
  ref=oracle(items,k),dp=patternDP(items,k,{maxW:100,maxH:100,maxArea:10000,maxStates:1000,frontier:1000,retainDominated:true}),
  actual=dp.solve([1,1,1,1]);
 const fits=(a,w,h)=>a[0]<=w&&a[1]<=h&&(a[0]===w||w-a[0]>=k)&&(a[1]===h||h-a[1]>=k);
 for(let w=5;w<=90;w+=5)for(let h=5;h<=90;h+=5)
  assert.equal(actual.some(a=>fits([a.w,a.h],w,h)),ref.some(a=>fits(a,w,h)),JSON.stringify({seed,w,h}));
 assert.equal(dp.stats.exhausted,false);
});
for(let seed=1;seed<=1000;seed++)test('PSS 1.3 randomized independent replay '+seed,()=>{
 const random=rng(seed),q={sheetW:700+seed%3*100,sheetH:500+seed%5*40,trim:seed%7===0?0:10,kerf:seed%11===0?0:5,
  pieces:Array.from({length:1+seed%4},(_,i)=>({id:i+1,l:80+Math.floor(random()*350),w:60+Math.floor(random()*200),q:1+Math.floor(random()*4),grain:seed%3!==0}))};
 const before=JSON.stringify(q),s=searchPSS13(q,{profile,seed,...small});
 assert.equal(JSON.stringify(q),before);assert.equal(validate(q,s).partCount,q.pieces.reduce((a,b)=>a+b.q,0));
 assert.equal(validatePSS(q,s,s.plan,profile).panelSawStagedValid,true);
 if(seed<=10){const again=searchPSS13(q,{profile,seed,...small});assert.deepEqual(again.sheets,s.sheets);assert.deepEqual(again.plan,s.plan);}
});

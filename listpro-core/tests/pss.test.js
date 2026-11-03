'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {checkInput}=require('../src/core');
const {validate}=require('../src/validator');
const {candidatePSS,rng}=require('../src/pss-candidates');
const {searchPSS,anchorDP}=require('../src/pss');
const {makePSSPlan}=require('../src/pss-plan');
const {assessPSS,validatePSS}=require('../src/pss-validator');
const {makeFormatSawPlan}=require('../src/format-saw-plan');
const {validateFormatSaw}=require('../src/format-saw-validator');
const profile=require('../profiles/pss-anchored-single-axis-v1.json');
const format=require('../profiles/format-saw-physical-v1.json');
const order=require('../benchmarks/manual-26-no-rotation.json');
const old=require('../benchmarks/manual-26-brain-1.1.json');
const saved=require('../benchmarks/manual-26-pss.json');
const clone=a=>JSON.parse(JSON.stringify(a));
function direct(p,axis='V',jobs=null){
 const s=candidatePSS(p,jobs??checkInput(p).jobs,axis,rng(1),0);
 if(!s)throw Error('Synthetic setup cannot fit');
 const plan=makePSSPlan(p,s,profile);return {s,plan};
}
test('PSS control is independently valid; no one-sheet claim',()=>{
 const r=validatePSS(order,saved,saved.plan,profile);
 assert.equal(r.metrics.parts,26);assert.equal(r.metrics.sheets,2);
 assert.equal(saved.search.oneSheetCandidates,0);
 assert(saved.sheets.every(sh=>sh.parts.every(a=>a.rotated===false)));
 assert(r.blanks.every(b=>b.turnCount<=1));
 assert(r.blanks.filter(b=>b.role==='PRIMARY_REMAINDER').every(b=>b.history.every(h=>h.type!=='rotate')));
});
test('Brain 1.1 rotate B006 at step 9 is rejected by roles',()=>{
 const r=assessPSS(order,old,old.plan,profile);
 assert.equal(r.geometryValid,true);assert.equal(r.physicalValid,true);assert.equal(r.panelSawStagedValid,false);
 assert(r.violations.some(v=>v.step===9&&v.code==='ROTATE_PRIMARY_REMAINDER'));
});
test('same historical geometry is physically valid in FORMAT_SAW',()=>{
 const plan=makeFormatSawPlan(order,old,format);
 const r=validateFormatSaw(order,old,plan,format);
 assert.equal(r.formatSawValid,true);
 assert.equal(validateFormatSaw(order,old,old.plan,format).formatSawValid,true);
 assert.throws(()=>validateFormatSaw(order,saved,saved.plan,format),/not FORMAT_SAW/);
});
test('real 1754 anchor allows explicit last-remainder conversion',()=>{
 const p={sheetW:2017,sheetH:1000,trim:10,kerf:5,pieces:[{id:1,l:238,w:180,q:1,grain:true},{id:2,l:1754,w:200,q:1,grain:true},{id:3,l:400,w:200,q:2,grain:true}]};
 const {s,plan}=direct(p);
 assert(plan.operations.some(a=>a.type==='FINAL_REMAINDER_AS_STRIP'&&a.anchor.partId===2));
 assert.equal(validatePSS(p,s,plan,profile).panelSawStagedValid,true);
 const missing=clone(plan);missing.operations=missing.operations.filter(a=>a.type!=='FINAL_REMAINDER_AS_STRIP');missing.operations.forEach((a,i)=>a.step=i+1);
 assert.equal(assessPSS(p,s,missing,profile).panelSawStagedValid,false);
});
test('sum 874+875+5 is not a real 1754-wide anchor',()=>{
 const p={sheetW:1774,sheetH:1000,trim:10,kerf:5,pieces:[{id:1,l:874,w:200,q:1,grain:true},{id:2,l:875,w:200,q:1,grain:true}]};
 const a={kind:'part',rect:{x:10,y:10,w:874,h:200},part:{id:1,instance:1,rotated:false}};
 const b={kind:'part',rect:{x:889,y:10,w:875,h:200},part:{id:2,instance:1,rotated:false}};
 const tree={kind:'cut',number:1,axis:'H',pos:210,kerf:5,rect:{x:10,y:10,w:1754,h:980},
 first:{kind:'cut',number:2,axis:'V',pos:884,kerf:5,rect:{x:10,y:10,w:1754,h:200},first:a,second:b},
 second:{kind:'waste',rect:{x:10,y:215,w:1754,h:775}}};
 const s={partCount:2,sheets:[{axis:'V',tree,parts:[{...a.rect,...a.part},{...b.rect,...b.part}],primaryStrips:[{index:1,path:'r',rect:tree.rect,anchor:a.part,finalRemainder:true}]}]};
 validate(p,s);const plan=makePSSPlan(p,s,profile),r=assessPSS(p,s,plan,profile);
 assert.equal(r.geometryValid,true);assert(r.violations.some(v=>v.code==='ANCHOR_WIDTH_OR_ALLOWANCE'));
});
test('no arbitrary anchor tolerance',()=>{
 const p={sheetW:1774,sheetH:1000,trim:10,kerf:5,pieces:[{id:1,l:1754,w:200,q:1,grain:true}]};
 const {s,plan}=direct(p);plan.operations.find(a=>a.type==='FINAL_REMAINDER_AS_STRIP').allowance=5;
 assert.equal(assessPSS(p,s,plan,profile).panelSawStagedValid,false);
});
test('a real but trailing equal-width part is not a leading anchor',()=>{
 const p={sheetW:1774,sheetH:1000,trim:10,kerf:5,pieces:[{id:1,l:1754,w:200,q:2,grain:true}]};
 const {s,plan}=direct(p);plan.operations.find(a=>a.type==='FINAL_REMAINDER_AS_STRIP').anchor.instanceId=2;
 assert.equal(assessPSS(p,s,plan,profile).panelSawStagedValid,false);
});
test('mode difference: repeated turns physically possible for FORMAT_SAW, forbidden by PSS',()=>{
 const p={sheetW:120,sheetH:100,trim:10,kerf:5,pieces:[{id:1,l:100,w:80,q:1,grain:true}]};
 const {s,plan}=direct(p),out=plan.outputs.find(a=>a.kind==='part'),id=out.blankId;
 const q=out.machineOrientation/90,vector=[[1,0],[0,1],[-1,0],[0,-1]],rect=out.materialRect;
 const dim=n=>n%2?{w:rect.h,h:rect.w}:{w:rect.w,h:rect.h};
 plan.operations.push({type:'feed',inputBlankId:id,purpose:'WORKING_STRIP',machineOrientation:q*90,...dim(q),materialRect:rect});
 for(let i=0;i<2;i++){const before=(q+i)%4,after=(before+1)%4;plan.operations.push({type:'rotate',inputBlankId:id,outputBlankIds:[id],angle:90,fromOrientation:before*90,toOrientation:after*90,turnCountBefore:i,turnCountAfter:i+1,...dim(after),machineGrain:vector[after]});}
 plan.operations.forEach((a,i)=>a.step=i+1);out.machineOrientation=(q+2)%4*90;out.machineGrain=vector[(q+2)%4];out.turnCount=2;
 const r=assessPSS(p,s,plan,profile);
 assert.equal(r.physicalValid,true);assert(r.violations.some(v=>v.code==='SECOND_TURN'));
 assert.equal(validateFormatSaw(p,s,{...plan,mode:'FORMAT_SAW',profileId:format.id},format).formatSawValid,true);
});
for(let seed=1;seed<=1100;seed++)test('PSS randomized independent role replay '+seed,()=>{
 let z=seed;const random=()=>((z=(Math.imul(z,1664525)+1013904223)>>>0)/4294967296);
 const p={sheetW:500,sheetH:400,trim:10,kerf:5,pieces:Array.from({length:1+seed%8},(_,i)=>({id:i+1,l:20+Math.floor(random()*170),w:20+Math.floor(random()*120),q:1+seed%3,grain:random()<0.7}))};
 const s=searchPSS(p,{profile,seed,iterations:8,refinements:0});
 const r=validatePSS(p,s,s.plan,profile);assert.equal(r.machineProfileValid,true);
 assert.equal(r.metrics.parts,p.pieces.reduce((n,a)=>n+a.q,0));
 if(seed<=20){const twice=searchPSS(p,{profile,seed,iterations:8,refinements:0});delete s.search.elapsedMs;delete twice.search.elapsedMs;assert.deepEqual(s,twice);}
});
test('knapsack plans contain distinct real instances, not synthetic width anchors',()=>{
 const jobs=checkInput(order).jobs,r=anchorDP(jobs,'H',order);
 assert(r.patterns.length>0);
 for(const pattern of r.patterns){assert.equal(new Set(pattern.map(a=>JSON.stringify([a.id,a.instance]))).size,pattern.length);assert(pattern.every(a=>jobs.includes(a)));}
});
test('whole untrimmed ordered panel needs no fake strip conversion',()=>{
 const p={sheetW:200,sheetH:100,trim:0,kerf:0,pieces:[{id:1,l:200,w:100,q:1,grain:true}]};
 const s=searchPSS(p,{profile:{...profile,machineCutAxes:['V'],maxSheetTurns:0},iterations:4,refinements:0});
 assert.equal(s.plan.operations.filter(a=>a.type==='cut'||a.type==='rotate').length,0);
 assert.equal(s.plan.operations.some(a=>a.type==='FINAL_REMAINDER_AS_STRIP'),false);
});
test('strict no-sheet-turn profile restricts the search to V primary axis',()=>{
 const p={sheetW:800,sheetH:600,trim:10,kerf:5,pieces:[{id:1,l:300,w:200,q:4,grain:true}]};
 const strict={...profile,maxSheetTurns:0};
 const s=searchPSS(p,{profile:strict,seed:1,iterations:16,refinements:0});
 assert(s.sheets.every(sh=>sh.axis==='V'));
 assert(s.verification.blanks.filter(b=>!b.parentBlankId).every(b=>b.turnCount===0));
});
test('forged child role does not grant turn permission',()=>{
 const plan=clone(saved.plan),cut=plan.operations.find(a=>a.phase==='PRIMARY_CUT');
 cut.outputRoles=['DETACHED_PRIMARY_STRIP','DETACHED_PRIMARY_STRIP'];
 assert.equal(assessPSS(order,saved,plan,profile).panelSawStagedValid,false);
});
test('invalid child counters and missing operations rejected',()=>{
 for(const edit of [plan=>{plan.operations.find(a=>a.type==='cut').outputTurnCounts=[1,1];},plan=>{plan.operations.splice(1,1);plan.operations.forEach((a,i)=>a.step=i+1);}]){const plan=clone(saved.plan);edit(plan);assert.equal(assessPSS(order,saved,plan,profile).machineProfileValid,false);}
});
test('PSS cannot accept a FORMAT_SAW profile',()=>assert.throws(()=>searchPSS(order,{profile:format,iterations:1}),/profile/));

test('primary strip display map cannot contradict independent proof',()=>{
 const plan=clone(saved.plan);plan.primaryStrips[0].materialRect.w++;
 assert(assessPSS(order,saved,plan,profile).violations.some(v=>v.code==='STRIP_MAP_MISMATCH'));
});
test('configured machine limits are enforced independently',()=>{
 for(const changed of [{...profile,maxCutLength:100},{...profile,minHoldWidth:4000},{...profile,maxStages:1}]){
  assert.equal(assessPSS(order,saved,saved.plan,changed).machineProfileValid,false);
 }
});
test('raw uncut panel cannot get strip turn rights by relabelling',()=>{
 const p={sheetW:200,sheetH:100,trim:0,kerf:0,pieces:[{id:1,l:200,w:100,q:1,grain:true}]};
 const {s,plan}=direct(p),id=plan.operations[0].blankId;
 plan.operations.splice(1,0,{type:'FINAL_REMAINDER_AS_STRIP',inputBlankId:id,outputBlankIds:[id],stage:1,anchor:{partId:1,instanceId:1},allowance:0,feedDirection:'LONG_POSITIVE'});
 plan.operations.forEach((a,i)=>a.step=i+1);
 assert(assessPSS(p,s,plan,profile).violations.some(v=>v.code==='ILLEGAL_FINAL_TRANSITION'));
});

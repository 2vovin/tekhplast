'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {searchStaged}=require('../src/staged');
const {makeStagedPlan}=require('../src/staged-plan');
const {validateStaged,assessStaged}=require('../src/staged-validator');
const profile=require('../profiles/abstract-staged-v-saw-v1.json');
const order=require('../benchmarks/manual-26-no-rotation.json');
const saved=require('../benchmarks/manual-26-staged.json');
const clone=a=>JSON.parse(JSON.stringify(a));
test('control: independent replay, primary strips, turns and material texture',()=>{
 const v=validateStaged(order,saved,saved.plan,profile);
 assert.equal(saved.sheets.length,1);assert.equal(saved.partCount,26);
 assert.equal(v.geometryValid,true);assert.equal(v.stagedPlanValid,true);assert.equal(v.machineProfileValid,true);
 assert.equal(v.metrics.primaryStrips,2);assert.equal(v.metrics.turns,16);assert.equal(v.metrics.cuts,44);
 assert(saved.sheets.every(s=>s.parts.every(a=>a.rotated===false)));
 assert(saved.plan.outputs.some(a=>a.kind==='part'&&a.machineOrientation!==0));
 assert(saved.plan.operations.every(a=>a.type!=='cut'||a.axis==='V'));
 assert(saved.plan.operations.every(a=>a.type!=='rotate'||!a.inputBlankId.endsWith('/raw')));
});
for(let seed=1;seed<=1100;seed++)test('random staged replay '+seed,()=>{
 let z=seed;const rng=()=>((z=(Math.imul(z,1664525)+1013904223)>>>0)/4294967296);
 const p={sheetW:500,sheetH:400,trim:10,kerf:5,pieces:Array.from({length:1+seed%8},(_,i)=>({id:i+1,l:20+Math.floor(rng()*180),w:20+Math.floor(rng()*140),q:1+seed%2,grain:rng()<0.7}))};
 const s=searchStaged(p,{seed,iterations:12,profile});
 const v=validateStaged(p,s,s.plan,profile);assert(v.geometryValid&&v.stagedPlanValid&&v.machineProfileValid);
 if(seed<=20){const twice=searchStaged(p,{seed,iterations:12,profile});delete s.search.elapsedMs;delete twice.search.elapsedMs;assert.deepEqual(s,twice);}
});
const mutations={
 'rotate whole sheet':plan=>{plan.operations.splice(1,0,{type:'rotate',inputBlankId:'s0/raw',stage:1,angle:90,fromOrientation:0,toOrientation:90});},
 'transverse operation before primary separation':plan=>{const i=plan.operations.findIndex(a=>a.phase==='strip-trim');const op=plan.operations.splice(i,1)[0];plan.operations.splice(1,0,op);},
 'wrong primary axis':plan=>{const op=plan.operations.find(a=>a.type==='cut');op.axis='H';},
 'missing primary cut':plan=>{const i=plan.operations.findIndex(a=>a.type==='cut'&&a.phase==='primary');plan.operations.splice(i,1);},
 'missing turn':plan=>{const i=plan.operations.findIndex(a=>a.type==='rotate');plan.operations.splice(i,1);},
 'unannounced axis change':plan=>{const op=plan.operations.find(a=>a.phase==='layout');op.axis='H';},
 'wrong local origin':plan=>{const op=plan.operations.find(a=>a.phase==='layout');op.start.y=10;},
 'wrong material coordinate':plan=>{plan.operations.find(a=>a.phase==='layout').materialPos++;},
 'wrong quarter turn':plan=>{plan.operations.find(a=>a.type==='rotate').toOrientation=180;},
 'wrong texture transform':plan=>{plan.operations.find(a=>a.type==='rotate').machineGrain=[1,0];},
 'unknown strip':plan=>{plan.operations.find(a=>a.type==='feed').inputBlankId='nonexistent';},
 'missing feed':plan=>{plan.operations.splice(plan.operations.findIndex(a=>a.type==='feed'),1);},
 'missing barrier':plan=>{plan.operations.splice(plan.operations.findIndex(a=>a.type==='endPrimary'),1);},
 'early barrier':plan=>{const i=plan.operations.findIndex(a=>a.type==='endPrimary'),op=plan.operations.splice(i,1)[0];plan.operations.splice(1,0,op);},
 'fake strip':plan=>{plan.primaryStrips[0].materialRect.w++;},
 'wrong strip genealogy':plan=>{plan.outputs.find(a=>a.kind==='part').parentBlankId='fake-parent';},
 'machine ordering mirrored incorrectly':plan=>{const op=plan.operations.find(a=>a.type==='cut'&&a.machineOrientation===90);op.outputBlankIds.reverse();},
 'wrong output texture':plan=>{plan.outputs.find(a=>a.kind==='part').materialGrain=[0,1];},
 'forbidden material part rotation':plan=>{plan.outputs.find(a=>a.kind==='part').part.rotated=true;},
 'skipped terminal':plan=>{plan.outputs.pop();},
 'duplicate terminal':plan=>{plan.outputs.push(clone(plan.outputs[0]));},
 'cut index gap':plan=>{plan.operations.find(a=>a.type==='cut').cutIndex=7;},
 'wrong stage':plan=>{plan.operations.find(a=>a.phase==='layout').stage++;},
 'reused blank ID':plan=>{const op=plan.operations.find(a=>a.type==='cut');op.outputBlankIds[0]=op.inputBlankId;}
};
for(const [name,mutate] of Object.entries(mutations))test('reject '+name,()=>{
 const plan=clone(saved.plan);mutate(plan);plan.operations.forEach((op,i)=>op.step=i+1);
 const result=assessStaged(order,saved,plan,profile);assert.equal(result.geometryValid,true);assert.equal(result.machineProfileValid,false);
});
test('operation numbering separate from cut numbering',()=>{
 const plan=clone(saved.plan);plan.operations[2].step++;
 assert.throws(()=>validateStaged(order,saved,plan,profile),/numbering/);
});
for(const [name,change] of Object.entries({
 'no strip rotations':{allowStripRotation:false,stripReorientationAllowed:false,maxTurnsPerBlank:0,maxStripTurns:0},
 'turn limit':{allowStripRotation:false,stripReorientationAllowed:false,maxTurnsPerBlank:0,maxStripTurns:0},'stage limit':{maxStages:1},
 'stroke limit':{maxCutLength:100},'feed envelope':{maxFeedWidth:100},
 'holding minimum':{minimumHoldWidth:5000}
}))test('profile rejection preserves staged status: '+name,()=>{
 const r=assessStaged(order,saved,saved.plan,{...profile,...change});
 assert.equal(r.geometryValid,true);assert.equal(r.stagedPlanValid,true);assert.equal(r.machineProfileValid,false);
});
test('continuation retains only independently checked incumbent',()=>{
 const p={sheetW:400,sheetH:300,trim:10,kerf:5,pieces:[{id:1,l:100,w:80,q:2,grain:true}]};
 const first=searchStaged(p,{seed:1,iterations:30,profile});
 const next=searchStaged(p,{seed:2,iterations:1,profile,previous:first});
 assert(next.sheets.length<=first.sheets.length);assert.equal(validateStaged(p,next,next.plan,profile).machineProfileValid,true);
 const bad=clone(first);bad.sheets[0].parts[0].w++;
 assert.throws(()=>searchStaged(p,{iterations:1,profile,previous:bad}));
});
test('profile is mandatory',()=>assert.throws(()=>searchStaged(order,{iterations:1}),/profile/));
test('material texture violation rejected independently of physical strip rotation',()=>{
 const s=clone(saved);s.sheets[0].parts[0].rotated=true;
 assert.equal(assessStaged(order,s,s.plan,profile).geometryValid,false);
});
test('zero kerf and no trim with two primary strips',()=>{
 const p={sheetW:200,sheetH:100,trim:0,kerf:0,pieces:[{id:1,l:100,w:100,q:2,grain:true}]};
 const pr={...profile,kerf:0};
 const s=searchStaged(p,{seed:1,iterations:20,profile:pr});
 assert.equal(validateStaged(p,s,s.plan,pr).metrics.parts,2);
});
test('limits are not silently invented',()=>{
 assert.equal(profile.maxStripTurns,1);assert.equal(profile.maxTurnsPerBlank,1);assert.equal(profile.maxSheetTurns,1);assert.equal(profile.maxStages,null);
 assert.equal(profile.machineCutAxes.length,1);assert.equal(profile.allowSheetRotation,true);assert.equal(profile.allowStripRotation,true);
});

test('second rotation of the same blankId is rejected before cut',()=>{
 const plan=clone(saved.plan),i=plan.operations.findIndex(op=>op.type==='rotate'),first=plan.operations[i];
 const second={...clone(first),fromOrientation:first.toOrientation,toOrientation:(first.toOrientation+90)%360,
  turnCountBefore:1,turnCountAfter:2,beforeSize:first.afterSize,afterSize:first.beforeSize};
 plan.operations.splice(i+1,0,second);plan.operations.forEach((op,j)=>op.step=j+1);
 assert.throws(()=>validateStaged(order,saved,plan,profile),/second rotation|turn limit/);
});
test('cut children get fresh counters while inheriting machine orientation',()=>{
 const v=validateStaged(order,saved,saved.plan,profile),byId=new Map(v.blanks.map(b=>[b.blankId,b]));
 let turnedDescendant=false;
 for(const b of v.blanks){
  assert.equal(b.initialTurnCount,0);assert(b.turnCount===0||b.turnCount===1);
  const parent=byId.get(b.parentBlankId);
  if(parent){assert.equal(b.initialMachineOrientation,parent.machineOrientation);if(parent.turnCount===1&&b.turnCount===1)turnedDescendant=true;}
  assert(b.history.filter(h=>h.type==='rotate').length<=1);
 }
 // An ancestor may turn, cut, and a descendant may turn independently later.
 assert(v.blanks.some(b=>b.turnCount===1&&b.initialMachineOrientation!==0));
 // Direct child may be a parallel offcut; walk the full ancestry too.
 assert(v.blanks.some(b=>{let p=byId.get(b.parentBlankId);while(p){if(p.turnCount===1&&b.turnCount===1)return true;p=byId.get(p.parentBlankId);}return false;}));
});
test('forged inherited turn counters in cut outputs rejected',()=>{
 const plan=clone(saved.plan);plan.operations.find(op=>op.type==='cut'&&op.turnCount===1).outputTurnCounts=[1,1];
 assert.throws(()=>validateStaged(order,saved,plan,profile),/counter reset/);
});
test('strict no-sheet-turn profile accepts the same zero-sheet-turn plan',()=>{
 const strict={...profile,id:'abstract-staged-v-no-sheet-turn-v1',allowSheetRotation:false,sheetRotationAllowed:false,maxSheetTurns:0};
 const plan=clone(saved.plan);plan.profileId=strict.id;
 assert.equal(validateStaged(order,saved,plan,strict).machineProfileValid,true);
 const rotate={type:'rotate',inputBlankId:'s0/raw',outputBlankIds:['s0/raw'],stage:1,angle:90,
  fromOrientation:0,toOrientation:90,turnCountBefore:0,turnCountAfter:1};
 plan.operations.splice(1,0,rotate);plan.operations.forEach((op,i)=>op.step=i+1);
 assert.throws(()=>validateStaged(order,saved,plan,strict),/original-sheet turn limit/);
});
test('consumed blank cannot rotate after CUT',()=>{
 const plan=clone(saved.plan),i=plan.operations.findIndex(op=>op.type==='rotate'),rot=clone(plan.operations[i]);
 const after=plan.operations.findIndex((op,j)=>j>i&&op.type==='cut'&&op.inputBlankId===rot.inputBlankId);
 plan.operations.splice(after+1,0,rot);plan.operations.forEach((op,j)=>op.step=j+1);
 assert.throws(()=>validateStaged(order,saved,plan,profile),/consumed input blank/);
});

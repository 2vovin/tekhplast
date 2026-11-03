'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pack}=require('../src/core');
const {makePlan}=require('../src/machine-plan');
const {validateTechnology,assessTechnology}=require('../src/technology-validator');
const profile=require('../profiles/abstract-fixed-xy-v1.json');
const control=require('../benchmarks/manual-26-no-rotation.json');
const saved=require('../benchmarks/manual-26-technology.json');
const clone=x=>JSON.parse(JSON.stringify(x));
test('saved control: independent geometry and technological replay',()=>{
 const r=validateTechnology(control,saved.layout,saved.plan,profile);
 assert.equal(r.geometry.valid,true);assert.equal(r.technology.valid,true);
 assert.equal(r.technology.loadedSheets,1);assert.equal(r.technology.rotations,0);
 assert.equal(r.technology.cuts,42);assert.equal(r.technology.cutLength,31889);
 assert.equal(saved.layout.partCount,26);
});
test('single-axis control is geometrically valid but technologically impossible',()=>{
 const one={...profile,id:'single-axis',allowedCutAxes:['V']},plan={...saved.plan,profileId:one.id};
 const r=assessTechnology(control,saved.layout,plan,one);
 assert.equal(r.geometry.valid,true);assert.equal(r.technology.valid,false);
 assert.match(r.technology.reason,/unavailable machine axis H/);
 // Neither extra sheets nor a packing heuristic can obtain interior y boundaries using V only.
 assert(control.pieces.every(a=>a.w<control.sheetH-2*control.trim));
});
for(let seed=1;seed<=1100;seed++)test('random fixed-coordinate machine replay '+seed,()=>{
 let z=seed;const rand=()=>((z=(Math.imul(z,1664525)+1013904223)>>>0)/4294967296);
 const p={sheetW:400,sheetH:300,trim:seed%2?10:0,kerf:5,pieces:Array.from({length:1+seed%9},(_,i)=>({id:i+1,l:20+Math.floor(rand()*160),w:20+Math.floor(rand()*100),q:1+seed%2,grain:true}))};
 const s=pack(p,{seed,iterations:2,profile});
 const r=validateTechnology(p,s,s.machinePlan,profile);
 assert.equal(r.technology.rotations,0);assert.equal(r.technology.valid,true);
});
const p={sheetW:100,sheetH:90,trim:10,kerf:5,pieces:[{id:1,l:30,w:20,q:2,grain:true}]};
function sample(){const s=pack(p,{iterations:1});return {s,plan:makePlan(p,s,profile)};}
const mutations={
 'sheet rotated on load':plan=>{plan.operations[0].orientation=90;},
 'sheet rotation command':plan=>{plan.operations.splice(1,0,{type:'rotate',input:'s0/raw',angle:90});},
 'strip rotation command':plan=>{plan.operations.splice(2,0,{type:'rotate',input:'s0/trim0',angle:90});},
 'translation':plan=>{plan.operations.splice(2,0,{type:'translate',input:'s0/trim0',dx:1,dy:0});},
 'rebase':plan=>{plan.operations.splice(2,0,{type:'rebase',input:'s0/trim0'});},
 'rotated cut':plan=>{plan.operations[5].orientation=90;},
 'cut endpoints':plan=>{plan.operations[1].to.x++;},
 'kerf':plan=>{plan.operations[1].kerf++;},
 'missing cut':plan=>{plan.operations.splice(5,1);},
 'duplicate consumed blank':plan=>{plan.operations.splice(2,0,clone(plan.operations[1]));},
 'child before parent':plan=>{[plan.operations[5],plan.operations[6]]=[plan.operations[6],plan.operations[5]];},
 'missing output':plan=>{plan.outputs.pop();},
 'output orientation':plan=>{plan.outputs[0].orientation=90;},
 'child ID collision':plan=>{plan.operations[1].children[0]='s0/raw';},
 'tree cut number':plan=>{plan.operations[5].layoutCutNumber=900;},
 'fixture':plan=>{plan.operations[1].fixture='freehand';},
 'unknown operation':plan=>{plan.operations[1].type='teleport';}
};
for(const [name,mutate] of Object.entries(mutations))test('reject geometry-valid plan: '+name,()=>{
 const {s,plan}=sample();mutate(plan);plan.operations.forEach((op,i)=>op.step=i+1);
 const r=assessTechnology(p,s,plan,profile);
 assert.equal(r.geometry.valid,true);assert.equal(r.technology.valid,false);
});
test('profile requires explicit axes and workholding',()=>{
 const {s,plan}=sample();
 for(const change of [{allowedCutAxes:[]},{workholding:null},{maxCutLength:10},{maxSheetW:20},{workholding:{...profile.workholding,minBlankWidth:200}}]){
  assert.throws(()=>validateTechnology(p,s,plan,{...profile,...change}));
 }
});
test('step numbers cannot be discontinuous',()=>{const {s,plan}=sample();plan.operations[1].step=9;assert.throws(()=>validateTechnology(p,s,plan,profile));});
test('no unchecked profile result from optimizer',()=>{
 const bad={...profile,id:'V-only',allowedCutAxes:['V']};
 assert.throws(()=>pack(p,{iterations:2,profile:bad}),/No technologically valid/);
});
test('trim exactly equal to kerf permits zero-area edge scrap',()=>{
 const q={...p,trim:5};const s=pack(q,{iterations:1,profile});assert.equal(validateTechnology(q,s,s.machinePlan,profile).technology.valid,true);
});
test('trim narrower than kerf rejected explicitly',()=>{
 assert.throws(()=>pack({...p,trim:2},{iterations:1,profile}),/Trim smaller than kerf/);
});
test('stock and strip rotation flags remain separate',()=>{
 const {s,plan}=sample();const sheet={...profile,allowSheetRotation:true,allowStripRotation:false};
 plan.operations.splice(2,0,{type:'rotate',input:'s0/trim0',angle:90});plan.operations.forEach((op,i)=>op.step=i+1);
 assert.throws(()=>validateTechnology(p,s,plan,sheet),/forbidden rotation/);
});

test('geometry-only continuation never trusts a previous technology badge',()=>{
 const {s}=sample();s.technology={valid:true};s.machinePlan={fake:true};s.equipmentProfile={fake:true};
 const next=pack(p,{iterations:1,previous:s});
 assert.equal(next.validation.technology.valid,null);
 assert.equal(next.machinePlan,undefined);
});

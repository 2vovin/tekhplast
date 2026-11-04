'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verify,arrange,solve}=require('../web/engine.cjs');
const {validateDeferred}=require('../src/deferred-strip-validator');
const examples=require('../web/examples.json');
const input=k=>verify(examples[k].parameters,examples[k].layout);
const bag=parts=>parts.map(a=>[a.id,a.instance,a.w,a.h,!!a.rotated].join(':')).sort();
const inside=(a,r)=>a.x>=r.x&&a.y>=r.y&&a.x+a.w<=r.x+r.w&&a.y+a.h<=r.y+r.h;
test('descending: the pictured 26-part order keeps one sheet and puts large details first',()=>{
 const base=input('26'),snapshot=JSON.stringify(base),s=arrange(base),parts=s.sheets[0].parts;
 assert.equal(JSON.stringify(base),snapshot);assert.equal(s.metrics.sheets,1);assert.equal(s.metrics.cuts,43);assert.equal(s.metrics.turns,12);assert.deepEqual(s.ordering.exceptions,[]);
 const one=id=>parts.find(p=>p.id===id),small=parts.find(p=>p.id===1&&p.instance===3);
 assert.equal(one(5).x,10);assert.equal(one(5).y,10);assert(one(10).x>one(5).x);assert(one(10).y<one(3).y);
 assert(one(6).x<one(7).x&&one(7).x<small.x);assert(one(8).x<one(9).x&&one(9).x<parts.find(p=>p.id===1&&p.instance===4).x);
 assert.deepEqual(bag(parts),bag(base.sheets[0].parts));assert.equal(validateDeferred(s.parameters,s,s.plan,s.equipmentProfile).targetPSSModelValid,true);
});
test('descending: copies, grain, primary strip allocations and input data stay intact on 26/44/171',()=>{
 for(const key of ['26','44','171']){
  const base=input(key),s=arrange(base);assert.notEqual(s.ordering.applied,false);assert.equal(s.metrics.sheets,base.metrics.sheets);
  assert.deepEqual(s.plan.primaryStrips.map(b=>b.materialRect),base.plan.primaryStrips.map(b=>b.materialRect));
  for(const b of base.plan.primaryStrips)assert.deepEqual(bag(s.sheets[b.sheet].parts.filter(a=>inside(a,b.materialRect))),bag(base.sheets[b.sheet].parts.filter(a=>inside(a,b.materialRect))));
  assert.equal(s.metrics.heldRemainderTurns,0);assert.equal(s.metrics.originalSheetTurns,0);assert.equal(s.verification.realMachineFeasibility,'unknown');
 }
});
test('descending: retained terminal anchors override sorting without creating a new turn right',()=>{
 const s=arrange(input('171'));assert.equal(s.ordering.exceptions.length,3);assert(s.ordering.exceptions.every(e=>e.sheet===5));
 assert.equal(s.metrics.parts,171);assert.equal(s.metrics.cuts,328);assert.equal(s.metrics.turns,106);
 assert.equal(validateDeferred(s.parameters,s,s.plan,s.equipmentProfile).targetPSSModelValid,true);
 const bad=JSON.parse(JSON.stringify(s.plan));const i=bad.operations.findIndex(o=>o.type==='feed'&&o.feedMode==='advance-in-place');bad.operations.splice(i+1,0,{...bad.operations[i],type:'rotate'});bad.operations.forEach((o,i)=>o.step=i+1);
 assert.throws(()=>validateDeferred(s.parameters,s,bad,s.equipmentProfile),/held remainder rotation/);
});
test('descending: original order is selectable, unsupported trim falls back visibly',()=>{
 const base=input('26'),s=arrange(base,'optimized');assert.deepEqual(s.sheets,base.sheets);assert.equal(s.ordering.mode,'optimized');assert.throws(()=>arrange(base,'bad'));
 const p={sheetW:1000,sheetH:800,trim:5,kerf:5,pieces:[{l:300,w:200,q:2,grain:true},{l:150,w:100,q:1,grain:true}]};
 const original=solve(p,{iterations:1}),fallback=arrange(original);assert.equal(fallback.ordering.applied,false);assert.deepEqual(fallback.plan,original.plan);assert.equal(fallback.verification.targetPSSModelValid,true);
});
test('descending: geometry and operations are deterministic and repeat sorting is idempotent',()=>{
 const s=arrange(input('171')),again=arrange(s);assert.deepEqual(again.sheets,s.sheets);assert.deepEqual(again.plan,s.plan);
});

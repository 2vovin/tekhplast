'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pack}=require('../src/core');
const {validate}=require('../src/validator');
const fixture=require('../benchmarks/manual-26-no-rotation.json');
test('control: all 26 on one sheet without rotations',()=>{
 const s=pack(fixture,{seed:1,iterations:10000});
 assert.equal(s.sheets.length,1);assert.equal(validate(fixture,s).partCount,26);
 assert(s.sheets.every(sh=>sh.parts.every(a=>!a.rotated)));
});
for(let seed=1;seed<=1100;seed++)test('random valid replay '+seed,()=>{
 let state=seed;const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const p={sheetW:400,sheetH:300,kerf:seed%6,trim:seed%11,pieces:Array.from({length:1+seed%12},(_,i)=>({id:i+1,l:10+Math.floor(rand()*180),w:10+Math.floor(rand()*130),q:1+Math.floor(rand()*3),grain:rand()<0.5}))};
 const s=pack(p,{seed,iterations:4});assert.equal(validate(p,s).valid,true);
 const again=pack(p,{seed,iterations:4});delete s.search.elapsedMs;delete again.search.elapsedMs;assert.deepEqual(s,again);
});
const p={sheetW:100,sheetH:90,kerf:5,trim:2,pieces:[{id:1,l:30,w:20,q:2,grain:true}]};
for(const [name,mutate] of Object.entries({
 missing:s=>s.sheets[0].parts.pop(),
 bounds:s=>s.sheets[0].tree.rect.w++,
 numbering:s=>s.sheets[0].tree.number++,
 kerf:s=>s.sheets[0].tree.kerf++,
 axis:s=>s.sheets[0].tree.axis='Z',
 coordinate:s=>s.sheets[0].tree.pos++,
 map:s=>s.sheets[0].parts[0].x++,
 duplicate:s=>s.sheets[0].parts.push(s.sheets[0].parts[0]),
 rotation:s=>{let n=s.sheets[0].tree;while(n.kind==='cut')n=n.first;n.part.rotated=true;},
 dimensions:s=>{let n=s.sheets[0].tree;while(n.kind==='cut')n=n.first;n.rect.w++;}
}))test('reject '+name,()=>{const s=pack(p,{iterations:1});mutate(s);assert.throws(()=>validate(p,s));});
test('exact fit and zero kerf',()=>{const q={sheetW:50,sheetH:40,trim:0,kerf:0,pieces:[{id:1,l:50,w:40,q:1}]};assert.equal(validate(q,pack(q,{iterations:1})).cuts,0);});
test('required rotation',()=>{const q={sheetW:30,sheetH:60,trim:0,kerf:0,pieces:[{id:1,l:60,w:30,q:1,grain:false}]};assert(pack(q,{iterations:1}).sheets[0].parts[0].rotated);q.pieces[0].grain=true;assert.throws(()=>pack(q,{iterations:1}),/does not fit/);});
test('duplicate IDs rejected',()=>assert.throws(()=>pack({...p,pieces:[p.pieces[0],p.pieces[0]]},{iterations:1})));
test('empty order',()=>assert.equal(validate({...p,pieces:[]},pack({...p,pieces:[]},{iterations:1})).partCount,0));

test('continuation preserves a checked incumbent',()=>{const s=pack(p,{iterations:20,seed:3});const next=pack(p,{iterations:1,seed:4,previous:s});assert.equal(validate(p,next).valid,true);assert(next.sheets.length<=s.sheets.length);const bad=JSON.parse(JSON.stringify(s));bad.partCount++;assert.throws(()=>pack(p,{iterations:1,previous:bad}));});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {cleanProject,candidateBandSets,calculate,loadExample}=require('../engine.cjs');
const sample=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../benchmarks/bazis-26-corrected.json'),'utf8'));

test('контрольный заказ: 26 физических деталей, ориентация 238x180',()=>{
 const p=cleanProject(sample);
 assert.equal(p.pieces.reduce((x,y)=>x+y.q,0),26);
 assert.equal(p.pieces[3].l,238);
 assert.equal(p.pieces[3].w,180);
 assert.equal(p.pieces[3].q,5);
 assert.equal(p.pieces[3].grain,true);
});
test('первичные полосы образованы реальными размерами, керф учтён',()=>{
 const p=cleanProject(sample),sets=candidateBandSets(p,'H');
 assert.ok(sets.length>0);
 assert.deepEqual(sets[0],[398,398,270,719]);
 for(const bands of sets){
  const dims=p.pieces.map(x=>x.w);
  assert.ok(bands.every(b=>dims.includes(b)));
  assert.ok(bands.reduce((s,b)=>s+b+p.kerf,0)<=p.sheetH-2*p.trim);
 }
});
test('проверенный демонстрационный результат не поворачивает удерживаемые остатки',()=>{
 const ex=loadExample();
 assert.equal(ex.result.metrics.sheets,1);
 assert.equal(ex.result.metrics.parts,26);
 assert.equal(ex.result.metrics.cuts,47);
 assert.equal(ex.result.metrics.turns,12);
 assert.equal(ex.result.verification.targetPSSModelValid,true);
 assert.equal(ex.result.verification.metrics.heldRemainderTurns,0);
 assert.equal(ex.result.verification.realMachineFeasibility,'unknown');
});
test('недопустимые размеры и количество отклоняются',()=>{
 assert.throws(()=>cleanProject({...sample,kerf:5,trim:2}),/Обрезка/);
 assert.throws(()=>cleanProject({...sample,pieces:[{l:100,w:80,q:2.4}]}),/Количество/);
 assert.throws(()=>cleanProject({...sample,pieces:[]}),/список деталей|1–500/);
});
test('маленький независимый заказ действительно проходит новый расчёт Held-Strips',()=>{
 const p={project:'Тест',sheetW:700,sheetH:500,kerf:5,trim:10,
  pieces:[{l:300,w:180,q:1,grain:true}]};
 const result=calculate(p,{iterations:100,seed:3});
 assert.equal(result.metrics.parts,1);
 assert.equal(result.metrics.sheets,1);
 assert.equal(result.verification.targetPSSModelValid,true);
 assert.equal(result.verification.metrics.heldRemainderTurns,0);
});

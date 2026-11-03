'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {cleanProject,loadExample,calculate,verifiedReferenceIncumbent,projectFromFile}=require('../engine.cjs');
const {parseTable}=require('../table-import.js');
const order=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../benchmarks/order-171/input.json'),'utf8'));
test('171-part reference is bundled and independently revalidated',()=>{
 const {project,result}=loadExample('171');
 assert.equal(project.pieces.length,98);assert.equal(result.metrics.parts,171);
 assert.equal(result.metrics.sheets,11);assert.equal(result.metrics.cuts,349);
 assert.equal(result.metrics.heldRemainderTurns,0);assert.equal(result.verification.realMachineFeasibility,'unknown');
 assert.ok(project.pieces.every(p=>p.grain===false));
 assert.throws(()=>loadExample('../../secret'),/Неизвестный пример/);
});
test('known solution cannot survive changed dimensions, counts or rotation permissions',()=>{
 const p=cleanProject(order);assert.ok(verifiedReferenceIncumbent(p));
 for(const [field,value]of [['l',2109],['q',2],['grain',true]]){
  const q=JSON.parse(JSON.stringify(p));q.pieces[0][field]=value;
  assert.equal(verifiedReferenceIncumbent(q),null);
 }
 assert.equal(verifiedReferenceIncumbent({...p,kerf:4}),null);
});
test('171 parts recompute from scratch with adaptive search and sheet neighborhoods',{timeout:180000},()=>{
 const progress=[],r=calculate(order,{iterations:100,seed:42,warmStart:false,onProgress:p=>progress.push(p)});
 assert.equal(r.metrics.parts,171);assert.equal(r.metrics.sheets,11);assert.ok(r.metrics.cuts<=349);
 assert.equal(r.metrics.heldRemainderTurns,0);assert.equal(r.search.algorithm,'adaptive-held-strips');
 assert.ok(r.search.trials.some(t=>t.phase==='V'));assert.ok(r.search.trials.some(t=>t.phase==='repack-V'));
 assert.equal(progress.at(-1).completed,6);
});
test('a new order requiring rotation is actually calculated',()=>{
 const r=calculate({sheetW:500,sheetH:700,kerf:5,trim:10,pieces:[{l:600,w:200,q:1,grain:false}]},{iterations:3,warmStart:false});
 assert.equal(r.metrics.parts,1);assert.equal(r.metrics.sheets,1);
 assert.ok(r.sheets[0].parts[0].rotated);
});
test('Excel and Markdown import keeps all 98 rows, 171 instances and half millimetres',()=>{
 const text=order.pieces.map(p=>[p.l,p.w,p.q].map(x=>String(x).replace('.',',')).join('\t')).join('\n');
 const parsed=parseTable(text);
 assert.deepEqual(parsed.map(p=>[p.l,p.w,p.q,p.grain]),order.pieces.map(p=>[p.l,p.w,p.q,p.grain]));
 assert.equal(parseTable('| 2108 | 968 | 1 |\n| ----- | ----- | -- |\n| 573,5 | 228 | 2 |')[1].l,573.5);
 assert.equal(parseTable('Длина;Ширина;Количество\n118,5;118,5;12',true)[0].grain,true);
 assert.throws(()=>parseTable('200;bad;1'),/Строка/);
 assert.throws(()=>parseTable('200;100;1.5'),/целое количество/);
});
test('saved named project and exported result reopen without treating name as an object',()=>{
 const p=cleanProject({...order,project:'Мой заказ'});
 assert.deepEqual(projectFromFile(JSON.parse(JSON.stringify(p))),p);
 assert.deepEqual(projectFromFile({parameters:p}),p);
 assert.deepEqual(projectFromFile({project:p}),p);
});

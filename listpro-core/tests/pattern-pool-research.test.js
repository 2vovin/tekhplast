'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {assemble}=require('../benchmarks/order-127-target16/retry/assemble.cjs');
const {validateCompleted}=require('../src/completed-rip-validator');
function fixture(copies=3,grain=false) {
 const parameters={sheetW:2750,sheetH:1830,kerf:5,trim:10,pieces:[{id:7,l:500,w:300,q:2,grain:false},{id:8,l:300,w:500,q:1,grain}]};
 const pattern={axis:'H',children:Array.from({length:copies},()=>({part:{id:1,rotated:false},w:500,h:300}))};
 return{parameters,patterns:[{pattern}]};
}
const selection={selection:[{index:0,copies:1}]};
test('pool assembly restores separate original row IDs and rotated orientation',()=>{
 const pool=fixture(),before=JSON.stringify(pool),r=assemble(pool,selection);
 assert.equal(JSON.stringify(pool),before);
 assert.deepEqual(r.sheets.flatMap(s=>s.parts.map(p=>p.id)).sort(),[7,7,8]);
 assert.equal(r.sheets.flatMap(s=>s.parts).find(p=>p.id===8).rotated,true);
 assert.equal(validateCompleted(pool.parameters,r,r.plan,r.equipmentProfile).targetPSSModelValid,true);
});
test('overcoverage is removed and a new complete physical plan is replayed',()=>{
 const r=assemble(fixture(4),selection);assert.equal(r.metrics.parts,3);assert.equal(r.metrics.sheets,1);assert.equal(r.metrics.heldRemainderTurns,0);
});
test('partial coverage never becomes an accepted full order',()=>{
 assert.throws(()=>assemble(fixture(2),selection,{attempts:1}),/Missing original quantities/);
});
test('group reassignment cannot bypass grain restriction',()=>{
 assert.throws(()=>assemble(fixture(3,true),selection,{attempts:1}),/Missing original quantities/);
});

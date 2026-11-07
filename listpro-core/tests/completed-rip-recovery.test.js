'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),learning=require('../src/completed-rip-experience'),{compileCompleted}=require('../src/completed-rip'),{fromTree}=require('../src/deferred-strip-patterns'),{validateCompleted}=require('../src/completed-rip-validator'),{fillExisting,extendStoredBooks}=require('../src/completed-rip-recovery');
const reference=require('../benchmarks/order-187-target16/result.json');
const augmented=()=>({...structuredClone(reference.parameters),pieces:[...structuredClone(reference.parameters.pieces),{id:100,l:2700,w:370,q:1,grain:false}]});
test('an added 2700x370 part fills the 2730x375 remnant without moving old parts',()=>{
 const p=augmented(),bank=learning.remember(learning.empty(),reference.parameters,reference),before=JSON.stringify(bank),r=extendStoredBooks(p,bank.books);
 assert(r);assert.equal(r.metrics.parts,188);assert.equal(r.metrics.sheets,16);assert.equal(r.recovery.placed,1);assert.equal(r.recovery.positionsPreserved,true);assert.equal(JSON.stringify(bank),before);
 const a=r.sheets[15].parts.find(a=>a.id===100);assert.deepEqual([a.x,a.y,a.w,a.h],[10,1445,2700,370]);
 // Stored books bind identical sizes to the current rows again; compare the
 // physical placements, while replay separately checks every requested ID/count.
 reference.sheets.forEach((sh,i)=>sh.parts.forEach(old=>assert(r.sheets[i].parts.some(b=>['x','y','w','h'].every(k=>old[k]===b[k])))));
 assert.equal(validateCompleted(p,r,r.plan,r.equipmentProfile).targetPSSModelValid,true);
});
test('a newer complete 17-sheet book cannot hide an older 16-sheet book with room',()=>{
 const p=augmented(),patterns=reference.sheets.map(s=>fromTree(s.tree,p.kerf)),bank=learning.remember(learning.empty(),reference.parameters,reference);
 const seventeen=compileCompleted(p,[...patterns,{part:{id:100,rotated:false},w:2700,h:370}]);
 const updated=learning.remember(bank,p,seventeen);assert.equal(updated.books[0].patterns.length,17);assert.equal(extendStoredBooks(p,updated.books).metrics.sheets,16);
});
test('experience fills stored waste before invoking a solver for an extra sheet',()=>{
 const p=augmented(),bank=learning.remember(learning.empty(),reference.parameters,reference);
 const r=learning.solveWithExperience(p,bank,()=>{throw Error('Must fill the existing remnant first');},{onBest:r=>assert.equal(r.metrics.parts,188)});
 assert.equal(r.metrics.sheets,16);assert.equal(r.learningMove,'stored-waste-fill');assert.equal(r.experienceInfo.used,true);
});
test('many variants of a larger order retain the preceding order as an extension seed',()=>{
 const p=augmented(),patterns=[...reference.sheets.map(s=>fromTree(s.tree,p.kerf)),{part:{id:100,rotated:false},w:2700,h:370}];let bank=learning.remember(learning.empty(),reference.parameters,reference);
 for(let i=0;i<18;i++){const rotated=[...patterns.slice(i%patterns.length),...patterns.slice(0,i%patterns.length)];bank=learning.remember(bank,p,compileCompleted(p,rotated));}
 assert(bank.books.some(b=>b.patterns.length===16));assert(bank.books.filter(b=>b.patterns.length===17).length<=4);assert.equal(extendStoredBooks(p,bank.books).metrics.sheets,16);
});
function small(){
 const p={sheetW:100,sheetH:100,trim:10,kerf:5,pieces:[{id:1,l:60,w:40,q:1,grain:false}]};
 const r=compileCompleted(p,[{part:{id:1,rotated:false},w:60,h:40}]);return{p,r,patterns:r.sheets.map(s=>fromTree(s.tree,p.kerf))};
}
test('free-space recovery obeys texture when the added part only fits rotated',()=>{
 const {p,patterns}=small(),locked={...p,pieces:[...p.pieces,{id:2,l:30,w:70,q:1,grain:true}]};
 const failed=fillExisting(locked,patterns);assert.equal(failed.complete,false);assert.equal(failed.stats.placed,0);
 const allowed=structuredClone(locked);allowed.pieces[1].grain=false;const recovered=fillExisting(allowed,patterns);assert.equal(recovered.complete,true);assert.equal(recovered.layout.metrics.parts,2);
});
test('a partial extension never becomes a complete opening result',()=>{
 const {p,r,patterns}=small(),more={...p,pieces:[...p.pieces,{id:2,l:70,w:30,q:2,grain:true}]};
 const partial=fillExisting(more,patterns);assert.equal(partial.complete,false);assert.equal(partial.stats.placed,1);assert.equal(partial.remaining[0].q,1);
 const bank=learning.remember(learning.empty(),p,r);assert.equal(extendStoredBooks(more,bank.books),null);
});
test('partial recovery plus a leftover suborder keeps repeated part instances unique',()=>{
 const {p,r}=small(),more={...p,pieces:[...p.pieces,{id:2,l:70,w:30,q:2,grain:true}]},bank=learning.remember(learning.empty(),p,r);let calls=0;
 const full=learning.solveWithExperience(more,bank,sub=>{calls++;assert.equal(sub.pieces.length,1);assert.equal(sub.pieces[0].q,1);assert.equal(sub.pieces[0].id,2);const normalized={...sub,pieces:[{...sub.pieces[0],id:1}]};return compileCompleted(normalized,[{part:{id:1,rotated:false},w:70,h:30}]);});
 assert.equal(calls,1);assert.equal(full.metrics.sheets,2);assert.equal(full.metrics.parts,3);assert.equal(full.recovery.placed,1);
 assert.deepEqual(full.sheets.flatMap(s=>s.parts.filter(a=>a.id===2).map(a=>a.instance)).sort(),[1,2]);assert.equal(validateCompleted(more,full,full.plan,full.equipmentProfile).targetPSSModelValid,true);
});
test('a part wider than the usable remnant is not placed in raw trim margins',()=>{
 const p=augmented();p.pieces.at(-1).l=2740;const bank=learning.remember(learning.empty(),reference.parameters,reference);
 assert.equal(extendStoredBooks(p,bank.books),null);
});
test('the stop condition prevents a stored-book extension search',()=>{
 const bank=learning.remember(learning.empty(),reference.parameters,reference);assert.equal(extendStoredBooks(augmented(),bank.books,{shouldStop:()=>true}),null);
});

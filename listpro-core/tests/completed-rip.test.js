'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{compileCompleted}=require('../src/completed-rip'),{validateCompleted}=require('../src/completed-rip-validator'),{fromDiagram}=require('../src/deferred-strip-patterns');
const clone=x=>JSON.parse(JSON.stringify(x)),H=(...children)=>({axis:'H',children}),V=(...children)=>({axis:'V',children}),part=(id,w,h)=>({part:{id,rotated:false},w,h});
const p={sheetW:600,sheetH:400,trim:10,kerf:5,pieces:[{id:1,l:410,w:95,q:1,grain:false},{id:2,l:390,w:90,q:1,grain:false},{id:3,l:100,w:190,q:1,grain:false},{id:4,l:510,w:100,q:1,grain:false}]};
const pattern=H(V(H(part(1,410,95),part(2,390,90)),part(3,100,190)),part(4,510,100));
const result=compileCompleted(p,[pattern]),check=r=>validateCompleted(r.parameters,r,r.plan,r.equipmentProfile);
test('410x90 remains unfinished, is released at END_RIP, then becomes 390x90',()=>{
 const end=result.plan.operations.find(o=>o.type==='endRip'&&o.materialRect.w===410&&o.materialRect.h===90);assert(end);
 const next=result.plan.operations.find(o=>o.type==='cut'&&o.inputBlankId===end.inputBlankId);assert(next&&next.step>end.step);assert.equal(next.materialAxis,'V');assert.equal(next.materialRect.w,410);assert.equal(next.materialPos-next.materialRect.x,390);
 assert.equal(result.sheets[0].parts.find(a=>a.id===1).y,10);assert.equal(result.sheets[0].parts.find(a=>a.id===2).y,110);assert.equal(check(result).metrics.parts,4);
});
test('cannot omit completion, end a rip early, rotate twice, or reset turn counters at completion',()=>{
 function renumber(r){r.plan.operations.forEach((o,i)=>o.step=i+1);return r;}
 const endIndex=result.plan.operations.findIndex(o=>o.type==='endRip'&&o.materialRect.w===410&&o.materialRect.h===90);
 const missing=clone(result);missing.plan.operations.splice(endIndex,1);assert.throws(()=>check(renumber(missing)));
 const early=clone(result),end=early.plan.operations.findIndex(o=>o.type==='endRip');const [e]=early.plan.operations.splice(end,1);const start=early.plan.operations.findIndex(o=>o.type==='startRip');early.plan.operations.splice(start+1,0,e);assert.throws(()=>check(renumber(early)),/premature/);
 const turns=clone(result),ridx=turns.plan.operations.findIndex(o=>o.type==='rotate');turns.plan.operations.splice(ridx+1,0,clone(turns.plan.operations[ridx]));assert.throws(()=>check(renumber(turns)),/rotation/);
 const reset=clone(result);reset.plan.operations[endIndex].turnCountAfter=99;assert.throws(()=>check(reset),/reset turns/);
});
test('exact final primary strip needs no additional separating cut',()=>{
 const q={sheetW:2750,sheetH:1830,trim:10,kerf:5,pieces:[2000,200,255,260].map((l,i)=>({id:i+1,l,w:300,q:1,grain:false}))};
 const r=compileCompleted(q,[V(...q.pieces.map(a=>part(a.id,a.l,a.w)))]);
 assert.equal(r.plan.operations.filter(o=>o.type==='cut'&&o.phase==='primary').length,3);
 const primaryEnd=r.plan.operations.find(o=>o.type==='endRip'&&o.primary);assert.equal(primaryEnd.materialRect.w,260);assert.equal(r.plan.primaryStrips.length,4);check(r);
});
test('all 229 parts on 15 reference sheets replay in the explicit completed-series profile',()=>{
 const p=require('../server/tests/fixtures/order-229.json'),ref=require('../benchmarks/order-229-manual-15/reference.json');const r=compileCompleted(p,ref.sheets.map(s=>fromDiagram(p,s.topology))),v=check(r);assert.equal(v.metrics.sheets,15);assert.equal(v.metrics.parts,229);assert.equal(v.metrics.heldRemainderTurns,0);assert.equal(v.metrics.originalSheetTurns,0);
 const bad=clone(r);bad.plan.operations.find(o=>o.type==='cut').kerf=3;assert.throws(()=>check(bad));
 const learning=require('../src/completed-rip-experience'),bank=learning.remember(learning.empty(),p,r);assert.equal(bank.patterns.length,15);const reused=require('../server/optimizer.cjs').solve(p,{experience:bank,iterations:1});assert.equal(reused.metrics.sheets,15);assert.equal(reused.experienceInfo.used,true);
});
test('independent replay on generated orders, including grain-locked parts',()=>{
 const {searchCompleted}=require('../src/completed-rip-search');let seed=71;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<12;i++){const q={sheetW:900,sheetH:700,trim:10,kerf:5,pieces:Array.from({length:8},(_,j)=>({id:j+1,l:60+Math.floor(rnd()*500),w:50+Math.floor(rnd()*350),q:1+Math.floor(rnd()*2),grain:j%3===0}))};const r=searchCompleted(q,{iterations:2,seed:42+i});assert.equal(check(r).metrics.parts,q.pieces.reduce((n,p)=>n+p.q,0));}
});
test('edge preparation handles zero trim and trim equal to the kerf without altering parts',()=>{
 for(const trim of [0,5,10]){const q={...p,trim};const r=compileCompleted(q,[pattern]);assert.equal(check(r).metrics.parts,4);}
});

test('complete-book-only lookup never searches for partial or unrelated books',()=>{
 const learning=require('../src/completed-rip-experience'),bank=learning.remember(learning.empty(),p,result);
 const unexpected=()=>{throw Error('Must not search');};
 assert.equal(learning.solveWithExperience({...p,pieces:[...p.pieces,{id:5,l:50,w:40,q:1,grain:false}]},bank,unexpected,{completeBooksOnly:true}),null);
 assert.equal(learning.solveWithExperience(p,bank,unexpected,{completeBooksOnly:true}).metrics.parts,4);
});
test('cooperative budget stops between candidates and retains a replayed full-order result',()=>{
 let stop=false;const r=require('../src/completed-rip-search').searchCompleted(p,{iterations:100,shouldStop:()=>stop,onBest:()=>{stop=true;}});assert.equal(r.search.budgetExhausted,true);assert.equal(check(r).metrics.parts,4);
});

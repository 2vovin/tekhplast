'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{auditPatterns,validatePlacements}=require('../src/reference-pattern-audit');
const p=require('../server/tests/fixtures/order-229.json'),ref=require('../benchmarks/order-229-manual-15/reference.json'),clone=x=>JSON.parse(JSON.stringify(x));
test('15-sheet PDF matches all 229 dimensions/counts, but geometry alone cannot enter the PSS bank',()=>{
 const a=auditPatterns(p,ref);assert(a.settingsMatch);assert(a.inventory.dimensionsMatch);assert(a.inventory.inventoryMatches);assert.equal(a.reconstructedGeometry.parts,229);assert.equal(a.sheets.length,15);assert.equal(a.targetPSSModelValid,false);assert.equal(a.realMachineFeasibility,'unknown');assert.deepEqual(a.admitted.map(s=>s.sourceSheet),[1,3,4,6,8,12,15]);assert.match(a.sheets[1].reason,/Retained group/);
 const bank=a.admitted.reduce((b,a)=>require('../src/cutting-experience').remember(b,a.result.parameters,a.result),require('../src/cutting-experience').empty());assert.equal(bank.solves,7);assert.equal(bank.patterns.length,7);
});
test('altered quantities, dimensions and kerf in PDF are rejected before admission',()=>{
 for(const change of [r=>r.sheets[0].inventory[0].q++,r=>r.sheets[0].inventory[0].l++,r=>r.sheets[0].printedKerf=3,r=>r.sheets[0].printedSize[0]+=20]){const r=clone(ref);change(r);assert.throws(()=>auditPatterns(p,r),/mismatch/);}
});
test('independent placement audit detects overlap, bounds, grain and missing instances',()=>{
 const a=auditPatterns(p,ref);for(const change of [s=>s[0].parts.pop(),s=>s[0].parts[0].x=-1,s=>Object.assign(s[0].parts[0],{x:s[0].parts[1].x,y:s[0].parts[1].y}),s=>s[0].parts[0].w++]){const s=clone(a.sheets);change(s);assert.throws(()=>validatePlacements(p,s));}
 const noTurns={...p,pieces:p.pieces.map(x=>({...x,grain:true}))};assert.throws(()=>validatePlacements(noTurns,a.sheets),/Grain/);
});
test('learned alternative preserves all 229 instances and replays every saved physical operation',()=>{
 const r=require('../benchmarks/order-229-manual-15/learned-alternative.json');
 assert.deepEqual(r.parameters.pieces.map(a=>[a.id,a.l,a.w,a.q,a.grain]),p.pieces.map(a=>[a.id,a.l,a.w,a.q,a.grain]));
 const v=require('../src/deferred-strip-validator').validateDeferred(p,r,r.plan,r.equipmentProfile);assert.equal(v.metrics.parts,229);assert.equal(v.metrics.sheets,16);assert.equal(v.metrics.heldRemainderTurns,0);assert.equal(v.metrics.largestWaste,3402800);
});

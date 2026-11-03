'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{auditReference}=require('../src/manual-reference-audit');
const order=require('../benchmarks/order-171/input.json'),ref=require('../benchmarks/order-171-manual-10/reference.json');
test('manual 10-sheet PDF: all 98 positions and 171 instances match the order',()=>{
 const a=auditReference(order,ref);assert.equal(a.inventoryMatches,true);assert.equal(a.parts,171);assert.equal(a.positions,98);assert.equal(a.sheets,10);assert.equal(a.areaLowerBound,10);
 assert.deepEqual(a.sheetProfiles.map(s=>s.parts),[15,12,9,11,16,16,13,18,18,43]);assert.deepEqual(a.sheetProfiles.map(s=>s.firstAxis),['H','H','H','H','H','H','H','V','V','V']);
 assert.deepEqual(a.printedSizeDifferences.map(s=>s.id),[60,61,79,80,82,98]);assert.equal(a.printedCutLengthM,314.68);
 assert.equal(a.exactGeometryVerified,false);assert.equal(a.physicalReplayVerified,false);
 assert.match(a.inputDimensionStatus,/^user-confirmed:/);assert.equal(a.dimensionsMatch,false);
 assert.equal(a.changedInstances,23);assert.equal(a.allReferenceDimensionsAtLeastOriginal,true);
 assert.equal(a.referencedPartArea,46163188);assert.equal(a.referenceAreaDifference,2675);
 assert.equal(order.pieces.find(p=>p.id===98).l,118.5);
});
test('manual reference audit rejects an omitted instance and a changed diagram label',()=>{
 const r=JSON.parse(JSON.stringify(ref));r.sheets[0].inventory[0].q--;assert.equal(auditReference(order,r).inventoryMatches,false);
 const d=JSON.parse(JSON.stringify(ref));d.sheets[0].parts[0].id=98;assert.equal(auditReference(order,d).inventoryMatches,false);
});

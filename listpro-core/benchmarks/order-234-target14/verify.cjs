'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const p=require('./input.json'),r=require('./result.json'),{validateCompleted}=require('../../src/completed-rip-validator');
function check(){
 const rows=fs.readFileSync(path.join(__dirname,'input.tsv'),'utf8').trim().split(/\r?\n/).map(s=>s.trim().split(/\s+/).map(v=>Number(v.replace(',','.'))));
 assert.deepEqual(rows,p.pieces.map(a=>[a.l,a.w,a.q]));assert.equal(rows.length,75);
 assert.deepEqual(r.parameters,p);assert.deepEqual([p.sheetW,p.sheetH,p.kerf,p.trim],[2750,1830,5,10]);assert.ok(p.pieces.every(a=>a.grain===false));
 assert.deepEqual([p.pieces[6].w,p.pieces[8].w,p.pieces[56].l],[779.5,537.5,779.5]);
 const v=validateCompleted(p,r,r.plan,r.equipmentProfile);assert.deepEqual(v.metrics,r.metrics);
 assert.equal(v.metrics.parts,234);assert.equal(v.metrics.sheets,14);assert.equal(v.metrics.heldRemainderTurns,0);assert.equal(v.metrics.originalSheetTurns,0);
 const area=p.pieces.reduce((s,a)=>s+a.l*a.w*a.q,0);assert.equal(area,65644689);
 const usefulArea=(p.sheetW-2*p.trim)*(p.sheetH-2*p.trim),minimumSheetsByArea=Math.ceil(area/usefulArea);
 assert.equal(minimumSheetsByArea,14);assert.ok(area>13*usefulArea);
 const inventory=p.pieces.map(a=>{const found=r.sheets.flatMap(s=>s.parts.filter(b=>b.id===a.id));assert.equal(found.length,a.q);assert.equal(new Set(found.map(b=>b.instance)).size,a.q);return{id:a.id,l:a.l,w:a.w,requested:a.q,placed:found.length};});
 return{parameters:{sheetW:p.sheetW,sheetH:p.sheetH,kerf:p.kerf,trim:p.trim,allPartsMayRotate:true},geometryValid:v.geometryValid,abstractCutTreeValid:v.abstractCutTreeValid,targetPSSModelValid:v.targetPSSModelValid,realMachineFeasibility:v.realMachineFeasibility,equipmentProfile:r.equipmentProfile,metrics:v.metrics,partAreaMm2:area,minimumSheetsByArea,sheetCountOptimal:v.metrics.sheets===minimumSheetsByArea,thirteenSheetUsableAreaMm2:13*usefulArea,usableAreaUtilization:area/(v.metrics.sheets*usefulArea),grossAreaUtilization:area/(v.metrics.sheets*p.sheetW*p.sheetH),inventory,assumptions:v.assumptions};
}
module.exports={check};
if(require.main===module)console.log(JSON.stringify(check(),null,2));

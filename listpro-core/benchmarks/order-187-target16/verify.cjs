'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const p=require('./input.json'),r=require('./result.json'),{validateCompleted}=require('../../src/completed-rip-validator');
function check(){
 const text=fs.readFileSync(path.join(__dirname,'input.tsv'),'utf8'),rows=text.trim().split(/\r?\n/).map(s=>s.trim().split(/\s+/).map(Number));
 assert.deepEqual(rows,p.pieces.map(a=>[a.l,a.w,a.q]));assert.equal(rows.length,99);assert.deepEqual(r.parameters,p);
 const v=validateCompleted(p,r,r.plan,r.equipmentProfile);
 assert.deepEqual(v.metrics,r.metrics);assert.equal(v.metrics.parts,187);assert.equal(v.metrics.sheets,16);
 assert.equal(v.metrics.heldRemainderTurns,0);assert.equal(v.metrics.originalSheetTurns,0);
 const area=p.pieces.reduce((s,a)=>s+a.l*a.w*a.q,0);assert.equal(area,74519000);
 const usableArea=(p.sheetW-2*p.trim)*(p.sheetH-2*p.trim),minimumSheetsByArea=Math.ceil(area/usableArea);assert.equal(minimumSheetsByArea,16);
 const inventory=p.pieces.map(a=>{const parts=r.sheets.flatMap(s=>s.parts.filter(b=>b.id===a.id));assert.equal(parts.length,a.q);assert.equal(new Set(parts.map(a=>a.instance)).size,a.q);return{id:a.id,l:a.l,w:a.w,requested:a.q,placed:parts.length};});
 return{sourceSha256:crypto.createHash('sha256').update(text).digest('hex'),parameters:{sheetW:p.sheetW,sheetH:p.sheetH,trim:p.trim,kerf:p.kerf,allPartsMayRotate:true},geometryValid:v.geometryValid,abstractCutTreeValid:v.abstractCutTreeValid,targetPSSModelValid:v.targetPSSModelValid,realMachineFeasibility:v.realMachineFeasibility,equipmentProfile:r.equipmentProfile,metrics:v.metrics,areaMm2:area,minimumSheetsByArea,sheetCountOptimal:v.metrics.sheets===minimumSheetsByArea,fifteenSheetUsableAreaMm2:15*usableArea,usableAreaUtilization:area/(16*usableArea),grossAreaUtilization:area/(16*p.sheetW*p.sheetH),inventory,assumptions:v.assumptions};
}
if(require.main===module)console.log(JSON.stringify(check(),null,2));
module.exports={check};

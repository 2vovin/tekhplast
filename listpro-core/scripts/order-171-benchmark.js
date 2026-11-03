'use strict';
const assert=require('node:assert/strict');
const {searchAdaptive,repackAdaptive}=require('../src/adaptive-held-strip');
const {makeHeldPlan}=require('../src/held-strip-plan');
const {validateHeld}=require('../src/held-strip-validator');
const p=require('../benchmarks/order-171/input.json'),saved=require('../benchmarks/order-171/result.json');
function profile(axis){return {...saved.equipmentProfile,id:'order-171-held-'+axis+'-v1',firstCutAxis:axis,machineCutAxes:[axis]};}
function verified(s,axis){const pr=profile(axis),plan=makeHeldPlan(p,s,pr);return {...s,parameters:p,equipmentProfile:pr,plan,verification:validateHeld(p,s,plan,pr)};}
const searches={},alternatives={};
for(const axis of ['H','V']){
 const t=searchAdaptive(p,{iterations:100,seed:42,axis,candidates:12,accept:s=>{try{verified(s,axis);return true;}catch{return false;}}});
 searches[axis]=t.stats;alternatives[axis]=verified(t.best,axis);
}
let best=alternatives.V;const neighborhoods=[];
for(const ix of [[5,7,9,10],[5,7,8,9,10],[6,7,9,10]]){
 const t=repackAdaptive(p,alternatives.V,{sheetIndices:ix,iterations:100,seed:42,axis:'V',accept:s=>{try{verified(s,'V');return true;}catch{return false;}}});
 const candidate=verified(t.best,'V'),a=candidate.verification.metrics,b=best.verification.metrics;
 neighborhoods.push({...t.stats,metrics:a});
 if(a.sheets<b.sheets||a.sheets===b.sheets&&a.cuts<b.cuts){
  best=candidate;best.neighborhood={base:'vertical',sheetIndices:ix,iterations:100,seed:42};
 }
}
assert.deepEqual(best.verification.metrics,saved.verification.metrics);
assert.deepEqual(best.sheets.map(s=>s.parts),saved.sheets.map(s=>s.parts));
assert.equal(best.verification.metrics.parts,171);
const report={searches,neighborhoods,alternatives:Object.fromEntries(Object.entries(alternatives).map(([a,s])=>[a,s.verification.metrics])),
 selected:best.verification.metrics,selectedNeighborhood:best.neighborhood,areaLowerBound:10,tenSheetsFound:false,
 realMachineFeasibility:'unknown',optimality:'not proven',node:process.version};
if(process.argv.includes('--write')){
 const fs=require('node:fs'),path=require('node:path'),files=require('../src/order-held-artifacts').artifacts(best);
 files['comparison.json']=JSON.stringify(report,null,2)+'\n';
 for(const axis of ['H','V'])files['alternatives/'+axis+'-result.json']=JSON.stringify(alternatives[axis])+'\n';
 for(const [name,content]of Object.entries(files)){
  const dest=path.join(__dirname,'../benchmarks/order-171',name);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);
 }
}
console.log('ORDER_171_REPORT '+JSON.stringify(report));

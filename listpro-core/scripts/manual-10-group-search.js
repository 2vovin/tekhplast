'use strict';
const fs=require('node:fs'),{searchAdaptive}=require('../src/adaptive-held-strip'),{makeHeldPlan}=require('../src/held-strip-plan'),{validateHeld}=require('../src/held-strip-validator');
const input=require('../benchmarks/order-171/input.json'),saved=require('../benchmarks/order-171/result.json'),reference=require('../benchmarks/order-171-manual-10/reference.json');
const results=[];
for(const map of reference.sheets){
 const counts=new Map(map.inventory.map(a=>[a.id,a.q]));
 const p={...input,pieces:input.pieces.filter(a=>counts.has(a.id)).map(a=>({...a,q:counts.get(a.id)}))};
 const profile={...saved.equipmentProfile,firstCutAxis:'H',machineCutAxes:['H']};
 const check=s=>validateHeld(p,s,makeHeldPlan(p,s,profile),profile);
 const run=searchAdaptive(p,{iterations:300,seed:42,axis:'H',candidates:32,accept:s=>{try{check(s);return true;}catch{return false;}}});
 check(run.best);
 results.push({manualSheet:map.sheet,parts:map.declaredParts,resultSheets:run.best.sheets.length,axis:'H',seed:42,iterations:300,candidates:32,elapsedMs:run.stats.elapsedMs,physicalCandidatesValidated:true});
}
if(process.argv.includes('--write'))fs.writeFileSync(require('node:path').join(__dirname,'../benchmarks/order-171-manual-10/group-search.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results));

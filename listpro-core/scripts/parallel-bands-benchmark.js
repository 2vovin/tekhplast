'use strict';
const assert=require('node:assert/strict');
const {searchBands}=require('../src/parallel-bands-search');
const {makeBandPlan}=require('../src/parallel-bands-plan');
const {validateBands,auditPrimary}=require('../src/parallel-bands-validator');
const {validate}=require('../src/validator');
const p=require('../benchmarks/bazis-26-corrected.json'),saved=require('../benchmarks/parallel-bands/result.json');
const profile=saved.equipmentProfile;let rejected=0,accepted=0;
const h=searchBands(p,{iterations:20000,seed:42,bandSets:[[719,398,398,270]],axis:'H',accept:s=>{
 try{const plan=makeBandPlan(p,s,profile);validateBands(p,s,plan,profile);accepted++;return true;}catch{rejected++;return false;}
}});
const plan=makeBandPlan(p,h.best,profile),verification=validateBands(p,h.best,plan,profile);
assert.equal(h.best.sheets.length,1);assert.equal(verification.metrics.parts,26);
assert.deepEqual(verification.metrics,saved.verification.metrics);
assert.deepEqual(h.best.sheets[0].parts,saved.sheets[0].parts);
const v=searchBands(p,{iterations:3000,seed:42,bandSets:[[1132,966,420],[966,966,420,297],[1132,1132,420]],axis:'V'});
const old={};for(const name of ['4','unlimited']){
 const s=require('../benchmarks/brain21/'+name+'/result.json');
 const r=auditPrimary(p,s,s.plan,s.equipmentProfile);assert.equal(r.targetPSSModelValid,false);
 old[name]={geometryValid:r.geometryValid,targetPSSModelValid:r.targetPSSModelValid,needleRejections:r.errors.filter(a=>a.reason.includes('Artificial primary tail'))};
}
console.log('PARALLEL_BANDS_REPORT '+JSON.stringify({horizontal:{search:h.stats,acceptedImprovements:accepted,rejectedImprovements:rejected,verification},
 vertical:{search:v.stats,geometry:validate(p,v.best),technology:'NOT VALIDATED: geometric comparison only'},
 historical:old,optimality:'not proven',node:process.version}));

'use strict';
const assert=require('node:assert/strict');
const {searchHeldStrips}=require('../src/held-strip-search');
const {makeHeldPlan}=require('../src/held-strip-plan');
const {validateHeld,auditHeld}=require('../src/held-strip-validator');
const {validate}=require('../src/validator');
const p=require('../benchmarks/bazis-26-corrected.json');
const saved=require('../benchmarks/held-strips/result.json');
const old=require('../benchmarks/parallel-bands/result.json');
const profile=saved.equipmentProfile;let accepted=0,rejected=0;
const h=searchHeldStrips(p,{iterations:20000,seed:42,bandSets:[[398,398,270,719]],axis:'H',accept:s=>{
 try{validateHeld(p,s,makeHeldPlan(p,s,profile),profile);accepted++;return true;}catch{rejected++;return false;}
}});
const verification=validateHeld(p,h.best,makeHeldPlan(p,h.best,profile),profile);
assert.equal(verification.metrics.sheets,1);assert.equal(verification.metrics.parts,26);
assert.deepEqual(h.best.sheets[0].parts,saved.sheets[0].parts);
assert.deepEqual(verification.metrics,saved.verification.metrics);
const oldAudit=auditHeld(p,old,old.plan,{...old.equipmentProfile,retainedSide:'HIGH_MATERIAL'});
assert.equal(oldAudit.targetPSSModelValid,false);
const regression=oldAudit.errors.find(e=>e.step===78&&e.code==='HELD_REMAINDER_ROTATION');assert.ok(regression);
const v=searchHeldStrips(p,{iterations:3000,seed:42,bandSets:[[1132,966,420],[966,966,420,297],[1132,1132,420]],axis:'V'});
if(process.argv.includes('--write')){
 const fs=require('node:fs'),path=require('node:path');
 const result={...h.best,parameters:p,equipmentProfile:profile,plan:makeHeldPlan(p,h.best,profile),verification};
 const files=require('../src/held-strip-artifacts').artifacts(result);
 files['search.json']=JSON.stringify({horizontal:h.stats,accepted,rejected,vertical:v.stats},null,2)+'\n';
 for(const [name,content]of Object.entries(files)){
  const dest=path.join(__dirname,'../benchmarks/held-strips',name);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);
 }
}
console.log('HELD_STRIPS_REPORT '+JSON.stringify({horizontal:{search:h.stats,acceptedImprovements:accepted,rejectedImprovements:rejected,metrics:verification.metrics},
 vertical:{search:v.stats,geometry:validate(p,v.best),technology:'NOT VALIDATED: geometric comparison only'},
 oldRegression:regression,targetPSSModelValid:verification.targetPSSModelValid,realMachineFeasibility:verification.realMachineFeasibility,
 optimality:'not proven',node:process.version}));

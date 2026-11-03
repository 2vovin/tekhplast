'use strict';
const {replayPhysical}=require('./physical-replay');
function validateExam(p,s,plan,profile){
 if(profile.id!=='abstract-staged-detached-strips-exam-v1')throw Error('Explicit exam profile required');
 const r=replayPhysical(p,s,plan,profile),roles=new Map(),main=new Map(),strips=new Map(),ended=new Set();
 for(const op of plan.operations){
  if(op.type==='load'){roles.set(op.blankId,{role:'MAIN',sheet:op.sheet});main.set(op.sheet,op.blankId);strips.set(op.sheet,[]);continue;}
  if(op.type==='endPrimary'){
   if(ended.has(op.sheet)||op.remainderBlankId!==main.get(op.sheet)||JSON.stringify(op.stripBlankIds)!==JSON.stringify(strips.get(op.sheet)))throw Error('Primary barrier/roles');
   ended.add(op.sheet);continue;
  }
  const e=r.events.find(e=>e.op.step===op.step),b=roles.get(op.inputBlankId);
  if(!b)throw Error('Unknown role');
  if(op.type==='rotate'){if(b.role!=='WORK'||!ended.has(b.sheet)||e.before.turnCount>=1)throw Error('Illegal main/double/early turn');continue;}
  if(op.type==='feed'){if(b.role==='MAIN'&&ended.has(b.sheet))throw Error('Main refeed after barrier');if(b.role==='WORK'&&!ended.has(b.sheet))throw Error('Early work feed');continue;}
  if(op.type!=='cut')throw Error('Unsupported operation');
  if(b.role==='MAIN'){
   if(ended.has(b.sheet)||main.get(b.sheet)!==op.inputBlankId||e.materialAxis!=='V'||e.before.q!==0)throw Error('Primary spine changed');
   const [a,c]=e.materialOutputs;
   if(e.materialPos===p.trim-p.kerf){roles.set(a.id,{role:'WASTE',sheet:b.sheet});roles.set(c.id,b);main.set(b.sheet,c.id);}
   else if(e.materialPos===p.sheetW-p.trim){roles.set(c.id,{role:'WASTE',sheet:b.sheet});roles.set(a.id,b);main.set(b.sheet,a.id);}
   else {roles.set(a.id,{role:'WORK',sheet:b.sheet});roles.set(c.id,b);main.set(b.sheet,c.id);strips.get(b.sheet).push(a.id);}
  }else{
   if(b.role!=='WORK'||!ended.has(b.sheet))throw Error('Unreleased working blank');
   for(const a of e.materialOutputs)roles.set(a.id,b);
  }
  roles.delete(op.inputBlankId);
 }
 if(ended.size!==s.sheets.length)throw Error('Missing barrier');
 return {geometryValid:true,abstractStagedValid:true,machineFeasibility:'unknown',metrics:r.metrics,usableRemnants:r.usableRemnants};
}
module.exports={validateExam};
'use strict';
// Independent of candidate generation, scheduling and sorting. Reconstruct the
// genealogy from verified CUT outputs, never from blank names or claimed counts.
const {validateRecursive}=require('./recursive-strip-validator');
const {replayPhysical}=require('./physical-replay');
const {checkProfile}=require('./bazis-10-tech-profile');
function analyzeAncestryTurns(p,layout,plan,profile){
 checkProfile(profile);
 const base=validateRecursive(p,layout,plan,profile.baseProfile);
 const replay=replayPhysical(p,layout,plan,profile.baseProfile);
 const primary=new Set(plan.primaryStrips.map(s=>s.blankId));
 const live=new Map(),history=new Map(),events=[],violations=[],settings=[],parts=[];
 let total=0,last=null,sizeSettings=0,travel=0,previousDirection=0,reversals=0,maxLevel=0;
 for(const e of replay.events){
  const op=e.op;
  if(e.kind==='load'){
   const state={blankId:op.blankId,parentBlankId:null,localTurns:0,ancestryTurns:0,rotationSteps:[],ancestors:[],level:0,pendingLevel:false,sheet:op.sheet,initialMachineOrientation:0,machineOrientation:0};
   live.set(op.blankId,state);history.set(op.blankId,{...state,materialRect:e.after.rect,createdAt:op.step});continue;
  }
  if(e.kind==='marker')continue;
  const b=live.get(op.inputBlankId);if(!b)throw Error('Ancestry: unknown or consumed blank');
  if(e.kind==='feed'){if(profile.settingPersistence==='per-blank')last=null;continue;}
  if(e.kind==='rotate'){
   b.machineOrientation=e.after.q*90;b.localTurns++;b.ancestryTurns++;b.rotationSteps.push(op.step);b.pendingLevel=true;total++;
   if(b.localTurns>profile.maxLocalTurns)throw Error('Ancestry: repeated local rotation');
   if(profile.maxAncestryTurns!==null&&b.ancestryTurns>profile.maxAncestryTurns)
    violations.push({step:op.step,blankId:b.blankId,ancestryTurns:b.ancestryTurns,limit:profile.maxAncestryTurns,rotationSteps:b.rotationSteps.slice()});
   Object.assign(history.get(b.blankId),{localTurns:b.localTurns,ancestryTurns:b.ancestryTurns,rotationSteps:b.rotationSteps.slice(),machineOrientation:b.machineOrientation});
   events.push({step:op.step,type:'rotate',blankId:b.blankId,level:b.level,localTurns:b.localTurns,ancestryTurns:b.ancestryTurns});continue;
  }
  if(e.kind!=='cut')throw Error('Ancestry: unsupported event');
  const value=op.axis==='V'?op.start.x:op.start.y,setting={axis:op.axis,value},changed=!last||last.axis!==setting.axis||last.value!==value;
  if(changed)sizeSettings++;
  if(last&&last.axis===setting.axis){const delta=value-last.value;travel+=Math.abs(delta);const direction=Math.sign(delta);if(direction){if(previousDirection&&previousDirection!==direction)reversals++;previousDirection=direction;}}
  settings.push({step:op.step,cutIndex:op.cutIndex,inputBlankId:b.blankId,...setting,changed,settingNumber:sizeSettings});last=setting;
  const childLevel=b.level>0?b.level+(b.pendingLevel?1:0):0;
  events.push({step:op.step,type:'cut',blankId:b.blankId,level:childLevel,localTurns:b.localTurns,ancestryTurns:b.ancestryTurns,outputs:op.outputBlankIds.slice()});
  live.delete(b.blankId);history.get(b.blankId).consumedAt=op.step;
  for(const child of e.materialOutputs){
   const level=primary.has(child.id)?1:childLevel,maxParent=b.ancestors.concat(b.blankId);
   const state={blankId:child.id,parentBlankId:b.blankId,localTurns:0,ancestryTurns:b.ancestryTurns,
    rotationSteps:b.rotationSteps.slice(),ancestors:maxParent,level,pendingLevel:false,sheet:b.sheet,initialMachineOrientation:e.before.q*90,machineOrientation:e.before.q*90};
   live.set(child.id,state);history.set(child.id,{...state,materialRect:child.rect,createdAt:op.step});maxLevel=Math.max(maxLevel,level);
  }
 }
 for(const o of plan.outputs){
  const b=live.get(o.blankId);if(!b)throw Error('Ancestry: missing terminal');
  if(o.kind==='part')parts.push({id:o.part.id,instance:o.part.instance,blankId:b.blankId,
   localTurns:b.localTurns,ancestryTurns:b.ancestryTurns,level:b.level,sheet:b.sheet,
   rotationSteps:b.rotationSteps.slice(),blankPath:b.ancestors.concat(b.blankId)});
 }
 const useful=base.usableRemnants.filter(r=>r.rect.w>=profile.usefulRemnantMinWidth&&r.rect.h>=profile.usefulRemnantMinHeight);
 const summary={...base.metrics,totalHandlingTurns:total,localTurnsMax:Math.max(0,...[...history.values()].map(b=>b.localTurns)),
  ancestryTurnsMax:Math.max(0,...parts.map(a=>a.ancestryTurns)),ancestryTurnsMaxAllBlanks:Math.max(0,...[...history.values()].map(a=>a.ancestryTurns)),
  stripLevelMax:maxLevel,partStripLevelMax:Math.max(0,...parts.map(a=>a.level)),
  materialAxisStages:base.metrics.stages,sizeSettings,distinctSettings:new Set(settings.map(s=>s.axis+':'+s.value)).size,
  stopTravel:travel,stopDirectionReversals:reversals,usefulRemnantArea:Math.max(0,...useful.map(r=>r.area))};
 return {geometryValid:true,abstractCutPlanValid:true,ancestryLimitValid:violations.length===0,
  technologyProfileValid:violations.length===0,machineFeasibility:'unknown',profileId:profile.id,metrics:summary,violations,
  parts,blanks:[...history.values()],events,settings,usefulRemnants:useful,
  semantics:{initialLoadingTurns:0,ancestry:'all physical rotations inherited through CUT, including trim rotations',
   level:'raw sheet 0; detached primary strip 1; a rotated strip advances one level on its next CUT; parallel cuts keep level',
   sizeSettings:'initial setting plus changes of local machine cut coordinate; '+profile.settingPersistence,
   solverDepth:'not a manufacturing metric; reported by optimizer separately'}};
}
function validateAncestryTurns(p,layout,plan,profile){
 const report=analyzeAncestryTurns(p,layout,plan,profile);
 if(!report.ancestryLimitValid){const first=report.violations[0];const e=Error('Ancestry turn limit exceeded at step '+first.step+': '+first.ancestryTurns+' > '+first.limit);e.code='ANCESTRY_LIMIT';e.report=report;throw e;}
 return report;
}
module.exports={analyzeAncestryTurns,validateAncestryTurns};
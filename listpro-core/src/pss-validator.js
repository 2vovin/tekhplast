'use strict';
// Independent PSS role/anchor replay. No imports from PSS optimizer or planner.
const {validate}=require('./validator');
const {replayPhysical}=require('./physical-replay');
function assessPSS(p,layout,plan,profile){
 let geometry;try{geometry=validate(p,layout);}catch(e){return {geometryValid:false,physicalValid:false,panelSawStagedValid:false,machineProfileValid:false,reason:e.message,violations:[]};}
 let replay;try{
  if(!profile||profile.mode!=='PANEL_SAW_STAGED'||!['HIGH'].includes(profile.primarySide)||profile.anchorAllowance!==0||profile.feedDirection!=='LONG_POSITIVE'||
   ![0,1].includes(profile.maxSheetTurns)||profile.maxTurnsPerBlank!==1||!Array.isArray(profile.allowedPrimaryAxes))throw Error('Unsupported PSS profile');
  if(plan.mode&&plan.mode!=='PANEL_SAW_STAGED')throw Error('Wrong technology mode');
  if(plan.mode&&plan.profileId!==profile.id)throw Error('Wrong PSS profile ID');
  replay=replayPhysical(p,layout,plan,profile);
 }catch(e){return {geometryValid:true,physicalValid:false,panelSawStagedValid:false,machineProfileValid:false,reason:e.message,violations:[]};}
 const roleHistory=new Map(),roleAtStep=new Map();let currentStep=0;
 const roles=new Map(),creation=new Map(),main=new Map(),done=new Set(),stripIds=new Map(),cutsBySheet=new Map(),orientation=new Map(),guards=new Map(),strips=[],violations=[];
 const err=(op,code,detail)=>violations.push({step:op.step,inputBlankId:op.inputBlankId??op.blankId,code,detail});
 const setRole=(id,role)=>{roles.set(id,role);if(!creation.has(id))creation.set(id,role);if(!roleHistory.has(id))roleHistory.set(id,[]);roleHistory.get(id).push({step:currentStep,role});};
 const canonical=(r,axis)=>axis==='H'?{x:r.y,y:r.x,w:r.h,h:r.w}:{...r};
 const axisOf=si=>layout.sheets[si].axis??'V';
 const partKey=a=>JSON.stringify([a.id,a.instance]);
 function witness(op,stripRect,si){
  const axis=axisOf(si),sr=canonical(stripRect,axis),anchor=op.anchor;
  if(!anchor){err(op,'MISSING_REAL_ANCHOR','Working strip needs partId/instanceId');return null;}
  const parts=layout.sheets[si].parts,a=parts.find(a=>a.id===anchor.partId&&a.instance===anchor.instanceId);
  if(!a){err(op,'FAKE_ANCHOR','Anchor is not a real placed order instance');return null;}
  const ar=canonical(a,axis);
  if(op.allowance!==0||op.feedDirection!=='LONG_POSITIVE'||ar.w!==sr.w||ar.x!==sr.x||ar.y!==p.trim){
   err(op,'ANCHOR_WIDTH_OR_ALLOWANCE','Exact real transverse dimension and leading placement required; no sum widths or arbitrary tolerance');return null;
  }
  const inside=parts.filter(a=>{const r=canonical(a,axis);return r.x>=sr.x&&r.x+r.w<=sr.x+sr.w&&r.y>=sr.y&&r.y+r.h<=sr.y+sr.h;});
  for(const a2 of inside)if(partKey(a2)!==partKey(a)&&canonical(a2,axis).y<ar.y+ar.h+p.kerf)err(op,'ANCHOR_NOT_LEADING','Other parts must be behind the real anchor');
  return {anchor:{id:a.id,instance:a.instance,rotated:a.rotated},anchorRect:{x:a.x,y:a.y,w:a.w,h:a.h},stripRect:{...stripRect},axis,canonicalAnchor:ar};
 }
 for(const event of replay.events){
  const op=event.op;currentStep=op.step;
  if(event.kind==='load'){
   const si=op.sheet,axis=axisOf(si);
   if(!profile.allowedPrimaryAxes.includes(axis))err(op,'PRIMARY_AXIS','Axis not allowed by profile');
   setRole(op.blankId,'PRIMARY_PANEL');roleAtStep.set(op.step,'PRIMARY_PANEL');main.set(si,op.blankId);stripIds.set(si,[]);cutsBySheet.set(si,0);continue;
  }
  if(op.type==='endPrimary'){
   const ids=stripIds.get(op.sheet)??[],declared=op.stripBlankIds??[];
   if(done.has(op.sheet)||JSON.stringify(ids)!==JSON.stringify(declared))err(op,'IMPLICIT_REMAINDER_PROMOTION','endPrimary cannot promote PRIMARY_REMAINDER into a strip');
   if(op.remainderBlankId!=null&&op.remainderBlankId!==main.get(op.sheet))err(op,'MAIN_SPINE','Wrong remaining primary blank');
   done.add(op.sheet);continue;
  }
  const b=event.before,id=op.inputBlankId,role=roles.get(id),si=b?.sheet;roleAtStep.set(op.step,role);
  if(op.type==='FINAL_REMAINDER_AS_STRIP'){
   if(plan.mode&&(!Array.isArray(op.outputBlankIds)||op.outputBlankIds.length!==1||op.outputBlankIds[0]!==id))err(op,'FINAL_TRANSITION_ID','Transition preserves the same physical blankId');
   if(!b||role!=='PRIMARY_REMAINDER'||done.has(si)||main.get(si)!==id){err(op,'ILLEGAL_FINAL_TRANSITION','Only current unprocessed remainder may be converted before barrier');continue;}
   const proof=witness(op,b.rect,si);
   if(proof){setRole(id,'DETACHED_PRIMARY_STRIP');stripIds.get(si).push(id);main.set(si,null);guards.set(id,proof);strips.push({sheet:si,blankId:id,...proof,finalRemainder:true});}
   continue;
  }
  if(!b){err(op,'MISSING_BLANK','Missing input');continue;}
  const primary=['PRIMARY_PANEL','PRIMARY_REMAINDER'].includes(role),axis=axisOf(si),cross=axis==='V'?'H':'V';
  if(event.kind==='feed'){
   if(primary&&op.purpose!=='PRIMARY_REPOSITION')err(op,'PRIMARY_REMAINDER_FEED_AS_STRIP','Primary panel/remainder cannot be fed as a detached strip');
   if(!primary&&!done.has(si))err(op,'EARLY_STRIP_PROCESSING','Complete primary series first');
   continue;
  }
  if(event.kind==='rotate'){
   if(primary){
    if(role!=='PRIMARY_PANEL'||done.has(si)||cutsBySheet.get(si)!==0||b.turnCount>=profile.maxSheetTurns)err(op,'ROTATE_PRIMARY_REMAINDER','Primary remainder cannot rotate after the first cut');
   }else{
    if(!['DETACHED_PRIMARY_STRIP','SECONDARY_BLANK'].includes(role)||!done.has(si))err(op,'ILLEGAL_STRIP_ROTATION','Only detached working blanks can rotate after primary barrier');
    if(event.after.turnCount>1)err(op,'SECOND_TURN','One turn per physical blankId');
   }
   continue;
  }
  if(event.kind!=='cut')continue;
  const children=event.materialOutputs;
  if(primary){
   if(done.has(si)||main.get(si)!==id)err(op,'MAIN_SPINE','Primary cuts must continue on the unique main remainder before barrier');
   if(event.materialAxis!==axis)err(op,'TRANSVERSE_PRIMARY_CUT','Primary cuts must remain parallel');
   if(!orientation.has(si))orientation.set(si,b.q);
   if(b.q!==orientation.get(si))err(op,'PRIMARY_ORIENTATION_CHANGED','Main panel orientation changed after first cut');
   const before=canonical(b.rect,axis),low=canonical(children[0].rect,axis),high=canonical(children[1].rect,axis);
   const U=axis==='V'?p.sheetW:p.sheetH,V=axis==='V'?p.sheetH:p.sheetW;
   if(before.y!==0||before.h!==V)err(op,'PRIMARY_NOT_FULL_SPAN','Primary rip must span raw panel');
   let trim=op.phase==='PRIMARY_TRIM';
   if(op.phase==='primary'&&((low.w===p.trim-p.kerf&&low.x===0)||(high.w===p.trim-p.kerf&&high.x===U-p.trim+p.kerf)))trim=true;
   if(trim){
    if(low.x===0&&low.w===p.trim-p.kerf){setRole(children[0].id,'WASTE');setRole(children[1].id,'PRIMARY_REMAINDER');main.set(si,children[1].id);}
    else if(high.x===U-p.trim+p.kerf&&high.w===p.trim-p.kerf){setRole(children[0].id,'PRIMARY_REMAINDER');setRole(children[1].id,'WASTE');main.set(si,children[0].id);}
    else{err(op,'UNJUSTIFIED_TRIM','Only actual configured side margins are trimming');setRole(children[0].id,'PRIMARY_REMAINDER');setRole(children[1].id,'WASTE');main.set(si,children[0].id);}
   }else{
    if(!['PRIMARY_CUT','primary'].includes(op.phase))err(op,'WRONG_PRIMARY_PHASE','Cannot cut main remainder as secondary blank');
    setRole(children[0].id,'PRIMARY_REMAINDER');setRole(children[1].id,'DETACHED_PRIMARY_STRIP');main.set(si,children[0].id);
    const proof=witness(op,children[1].rect,si);
    stripIds.get(si).push(children[1].id);
    if(proof){guards.set(children[1].id,proof);strips.push({sheet:si,blankId:children[1].id,...proof,finalRemainder:false});}
   }
   cutsBySheet.set(si,(cutsBySheet.get(si)??0)+1);
  }else{
   if(!['DETACHED_PRIMARY_STRIP','SECONDARY_BLANK'].includes(role)||!done.has(si))err(op,'NONWORKING_BLANK','Secondary cuts require detached working strip after primary barrier');
   setRole(children[0].id,'SECONDARY_BLANK');setRole(children[1].id,'SECONDARY_BLANK');
   const guard=guards.get(id),r=canonical(b.rect,axis),pos=event.materialPos;
   if(op.phase==='STRIP_TRIM'){
    const V=axis==='V'?p.sheetH:p.sheetW;
    if(event.materialAxis!==cross||!((pos===p.trim-p.kerf&&r.y===0)||(pos===V-p.trim&&r.y===p.trim)))err(op,'UNJUSTIFIED_END_TRIM','End trimming must use configured margins and full-span cuts');
    if(guard){for(const child of children)if(guard.anchorRect.x>=child.rect.x&&guard.anchorRect.y>=child.rect.y&&guard.anchorRect.x+guard.anchorRect.w<=child.rect.x+child.rect.w&&guard.anchorRect.y+guard.anchorRect.h<=child.rect.y+child.rect.h)guards.set(child.id,guard);}
   }else if(guard){
    const a=guard.canonicalAnchor;
    if(event.materialAxis!==cross||pos!==a.y+a.h)err(op,'ANCHOR_NOT_FIRST_CUT','Real leading anchor must be isolated across entire strip before descendants');
   }
  }
  if(op.inputRole&&op.inputRole!==role)err(op,'FORGED_INPUT_ROLE','Claimed role differs from independently derived role');
  if(op.outputRoles&&op.outputRoles.some((r,i)=>r!==roles.get(op.outputBlankIds[i])))err(op,'FORGED_CHILD_ROLE','Roles cannot be chosen by caller');
 }
 if(done.size!==layout.sheets.length)violations.push({step:null,code:'MISSING_PRIMARY_BARRIER',detail:'Every sheet must finish primary ripping'});
 for(const o of plan.outputs)if(o.role&&roles.get(o.blankId)!==o.role)violations.push({step:null,inputBlankId:o.blankId,code:'FORGED_FINAL_ROLE',detail:'Final role mismatch'});
 if(plan.mode){
  if(!Array.isArray(plan.primaryStrips)||plan.primaryStrips.length!==strips.length)violations.push({step:null,code:'STRIP_MAP_MISMATCH',detail:'Primary strip map differs from independently proved strips'});
  else for(const d of plan.primaryStrips){
   const actual=strips.find(a=>a.blankId===d.blankId);
   if(!actual||d.sheet!==actual.sheet||d.axis!==actual.axis||!d.anchor||d.anchor.partId!==actual.anchor.id||d.anchor.instanceId!==actual.anchor.instance||
    !['x','y','w','h'].every(k=>d.materialRect?.[k]===actual.stripRect[k]))violations.push({step:null,code:'STRIP_MAP_MISMATCH',detail:'Incorrect primary strip coordinates or anchor'});
  }
 }
 const blanks=replay.blanks.map(b=>({...b,roleAtCreation:creation.get(b.blankId),role:roles.get(b.blankId),roleHistory:roleHistory.get(b.blankId)??[]}));
 const metrics={...replay.metrics,primaryStrips:strips.length,substrips:blanks.filter(b=>b.roleAtCreation==='SECONDARY_BLANK'&&b.history.some(h=>h.type==='cut')).length,
  largestWaste:replay.metrics.largestWaste,wasteArea:replay.metrics.wasteArea};
 return {geometryValid:true,physicalValid:true,panelSawStagedValid:violations.length===0,machineProfileValid:violations.length===0,conditional:true,mode:'PANEL_SAW_STAGED',
  profileId:profile.id,geometry,metrics,usableRemnants:replay.usableRemnants,violations,reason:violations[0]?.detail??null,strips,blanks,trace:replay.events.map(e=>({step:e.op.step,type:e.op.type,inputBlankId:e.op.inputBlankId??e.op.blankId,role:roleAtStep.get(e.op.step),materialRect:e.before?.rect,outputBlankIds:e.op.outputBlankIds}))};
}
function validatePSS(p,layout,plan,profile){
 const result=assessPSS(p,layout,plan,profile);
 if(!result.machineProfileValid){const e=Error('PSS rejected: '+(result.reason??'invalid staged sequence'));e.violations=result.violations;throw e;}
 return result;
}
module.exports={assessPSS,validatePSS};

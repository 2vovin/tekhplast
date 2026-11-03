'use strict';
const {validate}=require('./validator');
function replayPhysical(p,layout,plan,profile){
 const geometry=validate(p,layout),fail=m=>{throw Error('Physical replay: '+m);};
 if(!plan||!Array.isArray(plan.operations)||!Array.isArray(plan.outputs))fail('plan schema');
 if(!profile||!Array.isArray(profile.machineCutAxes)||!profile.machineCutAxes.length||profile.machineCutAxes.some(a=>!['V','H'].includes(a)))fail('machine axes');
 for(const k of ['maxCutLength','maxFeedWidth','maxFeedHeight'])if(profile[k]!=null&&(!Number.isFinite(profile[k])||profile[k]<=0))fail('invalid machine capacity');
 for(const k of ['minHoldWidth','minHoldHeight'])if(!Number.isFinite(profile[k]??0)||(profile[k]??0)<0)fail('invalid holding limit');
 if(profile.maxStages!=null&&(!Number.isSafeInteger(profile.maxStages)||profile.maxStages<1))fail('invalid stage limit');
 const live=new Map(),used=new Set(),loaded=new Set(),records=new Map(),events=[],expected=new Map();
 const key=(si,a)=>JSON.stringify([si,a.id,a.instance]),vec=q=>[[1,0],[0,1],[-1,0],[0,-1]][q];
 layout.sheets.forEach((sh,si)=>sh.parts.forEach(a=>expected.set(key(si,a),a)));
 const eq=(a,b)=>a&&b&&['x','y','w','h'].every(k=>Number.isFinite(a[k])&&a[k]===b[k]);
 const dims=b=>b.q%2?{w:b.rect.h,h:b.rect.w}:{w:b.rect.w,h:b.rect.h};
 function limits(b){
  const d=dims(b);
  if((profile.minHoldWidth??0)>d.w||(profile.minHoldHeight??0)>d.h)fail('holding limits');
  if((profile.maxFeedWidth!=null&&d.w>profile.maxFeedWidth)||(profile.maxFeedHeight!=null&&d.h>profile.maxFeedHeight))fail('feed envelope');
 }
 function create(id,b,step){
  if(typeof id!=='string'||used.has(id))fail('reused blankId');
  used.add(id);live.set(id,b);
  records.set(id,{blankId:id,parentBlankId:b.parent,sheet:b.sheet,materialRect:{...b.rect},initialMachineOrientation:b.q*90,machineOrientation:b.q*90,initialTurnCount:0,turnCount:0,level:b.stage,history:[{step,type:b.parent?'separated':'loaded'}]});
 }
 let active=null,cuts=0,turns=0,feeds=0,length=0,maxStage=0;
 for(let i=0;i<plan.operations.length;i++){
  const op=plan.operations[i];if(op.step!==i+1)fail('step numbering');
  if(op.type==='load'){
   const id=op.blankId;
   if(!Number.isInteger(op.sheet)||op.sheet<0||op.sheet>=layout.sheets.length||loaded.has(op.sheet)||op.machineOrientation!==0||op.w!==p.sheetW||op.h!==p.sheetH)fail('load');
   const b={rect:{x:0,y:0,w:p.sheetW,h:p.sheetH},q:0,turnCount:0,sheet:op.sheet,parent:null,stage:1,lastAxis:layout.sheets[op.sheet].axis??'V'};
   limits(b);create(id,b,op.step);loaded.add(op.sheet);active=id;events.push({op,kind:'load',after:{...b,rect:{...b.rect}},outputs:[id]});continue;
  }
  if(op.type==='endPrimary'||op.type==='FINAL_REMAINDER_AS_STRIP'){
   events.push({op,kind:'marker',before:op.inputBlankId&&live.has(op.inputBlankId)?{...live.get(op.inputBlankId),rect:{...live.get(op.inputBlankId).rect}}:null});continue;
  }
  const b=live.get(op.inputBlankId);if(!b)fail('nonexistent or consumed input at step '+op.step);
  const before={...b,rect:{...b.rect}},record=records.get(op.inputBlankId);
  record.history.push({step:op.step,type:op.type});
  if(op.type==='feed'){
   const d=dims(b);
   if(op.machineOrientation!==b.q*90||op.w!==d.w||op.h!==d.h||(op.materialRect&&!eq(op.materialRect,b.rect)))fail('feed coordinates');
   limits(b);active=op.inputBlankId;feeds++;events.push({op,kind:'feed',before});continue;
  }
  if(active!==op.inputBlankId)fail('explicit feed required');
  if(op.type==='rotate'){
   if(!Array.isArray(op.outputBlankIds)||op.outputBlankIds.length!==1||op.outputBlankIds[0]!==op.inputBlankId)fail('rotation output identity');
   if(op.materialRect&&!eq(op.materialRect,b.rect))fail('rotation material snapshot');
   const priorSize=dims(b);
   if(op.beforeSize&&(op.beforeSize.w!==priorSize.w||op.beforeSize.h!==priorSize.h))fail('rotation initial size');
   if(op.angle!==90||op.fromOrientation!==b.q*90||op.toOrientation!==(b.q+1)%4*90)fail('rotation coordinates');
   if(op.turnCountBefore!=null&&op.turnCountBefore!==b.turnCount)fail('rotation counter');
   b.q=(b.q+1)%4;b.turnCount++;turns++;
   if(op.turnCountAfter!=null&&op.turnCountAfter!==b.turnCount)fail('rotation counter after');
   const d=dims(b);if(op.afterSize&&(op.afterSize.w!==d.w||op.afterSize.h!==d.h))fail('rotation final size');if(op.w!==d.w||op.h!==d.h||(op.machineGrain&&JSON.stringify(op.machineGrain)!==JSON.stringify(vec(b.q))))fail('rotated dimensions/grain');
   limits(b);record.machineOrientation=b.q*90;record.turnCount=b.turnCount;
   events.push({op,kind:'rotate',before,after:{...b,rect:{...b.rect}}});continue;
  }
  if(op.type!=='cut')fail('unknown operation '+op.type);
  const d=dims(b),v=op.axis==='V',pos=v?op.start?.x:op.start?.y,span=v?d.w:d.h,len=v?d.h:d.w;
  if(!profile.machineCutAxes.includes(op.axis)||!Number.isFinite(pos)||op.kerf!==p.kerf||op.cutIndex!==cuts+1)fail('cut axis/kerf/number');
  if(!op.start||!op.end||op.start.x!==(v?pos:0)||op.start.y!==(v?0:pos)||op.end.x!==(v?pos:d.w)||op.end.y!==(v?d.h:pos)||pos<0||pos+p.kerf>span||len<=0)fail('cut bounds');
  if(op.machineOrientation!==b.q*90||(op.w!=null&&op.w!==d.w)||(op.h!=null&&op.h!==d.h)||(op.materialRect&&!eq(op.materialRect,b.rect)))fail('cut snapshot');
  if(profile.maxCutLength!=null&&len>profile.maxCutLength)fail('stroke limit');
  if(op.turnCount!=null&&op.turnCount!==b.turnCount)fail('input counter');
  if(op.outputTurnCounts&&JSON.stringify(op.outputTurnCounts)!=='[0,0]')fail('child counters not reset');
  if(!Array.isArray(op.outputBlankIds)||op.outputBlankIds.length!==2||op.outputBlankIds[0]===op.outputBlankIds[1])fail('cut outputs');
  limits(b);
  let axis,rev;
  if(b.q===0){axis=op.axis;rev=false;}
  else if(b.q===1){axis=v?'H':'V';rev=v;}
  else if(b.q===2){axis=op.axis;rev=true;}
  else{axis=v?'H':'V';rev=!v;}
  const r=b.rect,size=axis==='V'?r.w:r.h,dist=rev?size-pos-p.kerf:pos,materialPos=(axis==='V'?r.x:r.y)+dist;
  if(op.materialAxis&&op.materialAxis!==axis)fail('material axis');
  if(op.materialPos!=null&&op.materialPos!==materialPos)fail('material coordinate');
  const rr=axis==='V'?[{...r,w:dist},{...r,x:materialPos+p.kerf,w:size-dist-p.kerf}]:[{...r,h:dist},{...r,y:materialPos+p.kerf,h:size-dist-p.kerf}];
  const matIds=rev?[op.outputBlankIds[1],op.outputBlankIds[0]]:op.outputBlankIds.slice();
  const stage=b.stage+(axis===b.lastAxis?0:1);
  if(op.stage!=null&&op.stage!==stage)fail('stage sequence');
  if(profile.maxStages!=null&&stage>profile.maxStages)fail('stage limit');
  live.delete(op.inputBlankId);matIds.forEach((id,j)=>create(id,{rect:rr[j],q:b.q,turnCount:0,sheet:b.sheet,parent:op.inputBlankId,stage,lastAxis:axis},op.step));
  cuts++;length+=len;maxStage=Math.max(maxStage,stage);active=null;
  events.push({op,kind:'cut',before,materialAxis:axis,materialPos,materialOutputs:matIds.map((id,j)=>({id,rect:rr[j]}))});
 }
 if(loaded.size!==layout.sheets.length||live.size!==plan.outputs.length)fail('missing sheets or outputs');
 const seen=new Set(),partsSeen=new Set();
 for(const o of plan.outputs){
  const b=live.get(o.blankId);if(!b||seen.has(o.blankId)||!eq(o.materialRect,b.rect)||o.machineOrientation!==b.q*90)fail('output state');
  if(o.turnCount!=null&&o.turnCount!==b.turnCount)fail('output turn count');
  if(o.parentBlankId!=null&&o.parentBlankId!==b.parent)fail('output genealogy');
  if(o.materialGrain&&JSON.stringify(o.materialGrain)!=='[1,0]')fail('material grain');
  if(o.machineGrain&&JSON.stringify(o.machineGrain)!==JSON.stringify(vec(b.q)))fail('machine grain');
  if(o.kind==='part'){
   const k=key(b.sheet,o.part),a=expected.get(k);
   if(!a||partsSeen.has(k)||!eq(b.rect,a)||o.part.rotated!==a.rotated)fail('part identity/material orientation');
   partsSeen.add(k);
  }else if(!['waste','trim-waste'].includes(o.kind))fail('unknown output kind');
  seen.add(o.blankId);
 }
 if(partsSeen.size!==expected.size)fail('missing ordered parts');
 const usableRemnants=plan.outputs.filter(o=>o.kind!=='part').map(o=>{
  const b=live.get(o.blankId),x=Math.max(p.trim,b.rect.x),y=Math.max(p.trim,b.rect.y),
   right=Math.min(p.sheetW-p.trim,b.rect.x+b.rect.w),bottom=Math.min(p.sheetH-p.trim,b.rect.y+b.rect.h);
  return {sheet:b.sheet,blankId:o.blankId,rect:{x,y,w:Math.max(0,right-x),h:Math.max(0,bottom-y)},area:Math.max(0,right-x)*Math.max(0,bottom-y)};
 }).filter(a=>a.area>0);
 return {geometryValid:true,physicalValid:true,geometry,usableRemnants,metrics:{sheets:layout.sheets.length,parts:geometry.partCount,cuts,cutLength:length,turns,feeds,stages:maxStage,operations:plan.operations.length,largestWaste:Math.max(0,...usableRemnants.map(a=>a.area)),wasteArea:usableRemnants.reduce((n,a)=>n+a.area,0)},events,blanks:[...records.values()],live};
}
module.exports={replayPhysical};

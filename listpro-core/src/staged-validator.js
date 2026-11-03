'use strict';
// Independent replay: no imports from staged optimizer or staged planner.
const {validate}=require('./validator');
function validateStaged(p,layout,plan,profile){
 const geometry=validate(p,layout);
 const fail=m=>{throw Error('Staged replay rejected: '+m);};
 const equal=(a,b)=>a&&b&&['x','y','w','h'].every(k=>Number.isFinite(a[k])&&a[k]===b[k]);
 const vector=q=>q===0?[1,0]:q===1?[0,1]:q===2?[-1,0]:[0,-1];
 const dimensions=b=>b.q===0||b.q===2?{w:b.rect.w,h:b.rect.h}:{w:b.rect.h,h:b.rect.w};
 if(!profile||typeof profile.allowSheetRotation!=='boolean'||profile.sheetRotationAllowed!==profile.allowSheetRotation||
  ![0,1].includes(profile.maxSheetTurns)||profile.allowSheetRotation!==(profile.maxSheetTurns===1)||
  ![0,1].includes(profile.maxTurnsPerBlank)||profile.maxStripTurns!==profile.maxTurnsPerBlank||
  profile.allowStripRotation!==(profile.maxTurnsPerBlank===1)||
  typeof profile.allowStripRotation!=='boolean'||profile.stripReorientationAllowed!==profile.allowStripRotation||
  profile.firstCutAxis!=='V'||!Array.isArray(profile.machineCutAxes)||!profile.machineCutAxes.length||
  profile.machineCutAxes.some(a=>!['V','H'].includes(a))||!profile.machineCutAxes.includes('V')||
  profile.kerf!==p.kerf||profile.feedPolicy!=='independent-blank-local-origin'||
  profile.trimPolicy!=='rip-side-margins-then-cross-trim-each-strip')fail('unsupported or incomplete profile');
 for(const key of ['maxStripTurns','maxStages','maxCutLength','maxFeedWidth','maxFeedHeight'])
  if(profile[key]!==null&&(!Number.isFinite(profile[key])||profile[key]<0))fail('profile limit '+key);
 for(const key of ['maxStripTurns','maxStages'])if(profile[key]!==null&&!Number.isSafeInteger(profile[key]))fail('integer limit '+key);
 for(const key of ['minimumHoldWidth','minimumHoldHeight'])if(!Number.isFinite(profile[key])||profile[key]<0)fail('holding limits');
 if(p.trim>0&&p.trim<p.kerf)fail('trim below kerf');
 if(!plan||plan.version!==1||plan.model!=='staged-panel-saw'||plan.profileId!==profile.id||
  !Array.isArray(plan.operations)||!Array.isArray(plan.primaryStrips)||!Array.isArray(plan.outputs))fail('plan header');
 const expected=new Map(),terminals=new Map(),stripLists=new Map(),declared=[];
 // Derive full-height primary spine from geometry; metadata cannot relabel an arbitrary tree.
 layout.sheets.forEach((sh,si)=>{
  const prefix='s'+si,ss=sh.primaryStrips;
  if(!Array.isArray(ss)||!ss.length)fail('no primary strips');
  let spine=sh.tree,path='r',x=p.trim;
  ss.forEach((strip,i)=>{
   const r={x,y:p.trim,w:strip.rect.w,h:p.sheetH-2*p.trim};
   if(strip.index!==i+1||!equal(strip.rect,r)||r.w<=0)fail('strip geometry');
   if(i<ss.length-1){
    if(spine.kind!=='cut'||spine.axis!=='V'||spine.pos!==x+r.w||strip.path!==path+'/0'||!equal(spine.first.rect,r))fail('not a primary rip spine');
    spine=spine.second;path+='/1';x+=r.w+p.kerf;
   }else if(strip.path!==path||!equal(spine.rect,r)||x+r.w!==p.sheetW-p.trim)fail('last primary strip');
  });
  function exp(input,axis,pos,ids,phase,geometryCutNumber=null,sheet=si){expected.set(input,{axis,pos,ids,phase,geometryCutNumber,sheet});}
  let raw=prefix+'/raw';
  if(p.trim>0){
   exp(raw,'V',p.trim-p.kerf,[prefix+'/side0',prefix+'/side-rem'],'primary');terminals.set(prefix+'/side0',{kind:'trim-waste'});
   exp(prefix+'/side-rem','V',p.sheetW-p.trim,[prefix+'/body',prefix+'/side1'],'primary');terminals.set(prefix+'/side1',{kind:'trim-waste'});raw=prefix+'/body';
  }
  const ids=[];
  ss.forEach((strip,i)=>{
   const sid=prefix+'/strip'+(i+1);
   if(i<ss.length-1){exp(raw,'V',strip.rect.x+strip.rect.w,[sid,prefix+'/rip-rem'+i],'primary');raw=prefix+'/rip-rem'+i;ids.push(sid);}
   else ids.push(raw);
   const id=ids[i];
   declared.push({sheet:si,stripIndex:i+1,blankId:id,geometryPath:strip.path,materialRect:{x:strip.rect.x,y:0,w:strip.rect.w,h:p.sheetH}});
   let root=id;
   if(p.trim>0){
    exp(root,'H',p.trim-p.kerf,[id+'/top',id+'/after-top'],'strip-trim');terminals.set(id+'/top',{kind:'trim-waste'});
    exp(id+'/after-top','H',p.sheetH-p.trim,[id+'/work',id+'/bottom'],'strip-trim');terminals.set(id+'/bottom',{kind:'trim-waste'});root=id+'/work';
   }
   let node=sh.tree;for(const bit of strip.path.split('/').slice(1))node=bit==='0'?node.first:node.second;
   function interior(n,blank){
    if(n.kind==='cut'){exp(blank,n.axis,n.pos,[blank+'/0',blank+'/1'],'layout',n.number);interior(n.first,blank+'/0');interior(n.second,blank+'/1');}
    else terminals.set(blank,{kind:n.kind,part:n.part});
   }interior(node,root);
  });stripLists.set(si,ids);
 });
 if(plan.primaryStrips.length!==declared.length)fail('primary declaration count');
 declared.forEach((d,i)=>{const a=plan.primaryStrips[i];if(!a||a.sheet!==d.sheet||a.stripIndex!==d.stripIndex||a.blankId!==d.blankId||a.geometryPath!==d.geometryPath||!equal(a.materialRect,d.materialRect))fail('primary declaration');});
 const registry=new Map();
 const sheetOrientation=new Map(),sheetCutCounts=new Map();
 const live=new Map(),used=new Set(),loaded=new Set(),primaryDone=new Set(),consumed=new Set(),trace=[];
 let active=null,cuts=0,turns=0,feeds=0,cutLength=0,stages=1,substripInputs=new Set(),trimCuts=0,primaryCuts=0;
 function put(id,b){if(typeof id!=='string'||used.has(id))fail('blank ID collision');used.add(id);live.set(id,b);
  registry.set(id,{blankId:id,parentBlankId:b.parent,materialRect:{...b.rect},materialOrientation:0,
   initialMachineOrientation:b.q*90,machineOrientation:b.q*90,initialTurnCount:0,turnCount:0,level:b.stage,history:[{step:b.createdStep,type:b.parent?'separated':'loaded'}]});
 }
 function limits(b){
  const d=dimensions(b);
  if(d.w<profile.minimumHoldWidth||d.h<profile.minimumHoldHeight)fail('cannot hold blank');
  if((profile.maxFeedWidth!==null&&d.w>profile.maxFeedWidth)||(profile.maxFeedHeight!==null&&d.h>profile.maxFeedHeight))fail('feed envelope collision');
 }
 for(let i=0;i<plan.operations.length;i++){
  const op=plan.operations[i];if(op.step!==i+1)fail('operation numbering');
  if(op.type==='load'){
   if(!Number.isInteger(op.sheet)||op.sheet<0||op.sheet>=layout.sheets.length||loaded.has(op.sheet)||
    op.blankId!=='s'+op.sheet+'/raw'||op.machineOrientation!==0||op.stage!==1||op.w!==p.sheetW||op.h!==p.sheetH)fail('sheet load or rotation');
   const b={rect:{x:0,y:0,w:p.sheetW,h:p.sheetH},q:0,stage:1,lastAxis:'V',sheet:op.sheet,parent:null,turns:0,root:true,createdStep:op.step};
   limits(b);put(op.blankId,b);loaded.add(op.sheet);active=op.blankId;
   trace.push({step:op.step,type:op.type,blankId:op.blankId,machineOrientation:0});continue;
  }
  if(op.type==='endPrimary'){
   if(!loaded.has(op.sheet)||primaryDone.has(op.sheet)||op.stage!==1||!Array.isArray(op.stripBlankIds)||
    JSON.stringify(op.stripBlankIds)!==JSON.stringify(stripLists.get(op.sheet)))fail('primary barrier declaration');
   for(const [id,e] of expected)if(e.sheet===op.sheet&&e.phase==='primary'&&!consumed.has(id))fail('primary rip unfinished');
   for(const id of op.stripBlankIds){const b=live.get(id);if(!b||b.q!==(sheetOrientation.get(op.sheet)??b.q)||b.rect.y!==0||b.rect.h!==p.sheetH)fail('primary strip not available');}
   primaryDone.add(op.sheet);active=null;trace.push({step:op.step,type:op.type,sheet:op.sheet});continue;
  }
  const b=live.get(op.inputBlankId);if(!b)fail('nonexistent or consumed input blank');
  const ready=primaryDone.has(b.sheet);
  registry.get(op.inputBlankId).history.push({step:op.step,type:op.type});
  if(op.type==='feed'){
   if(!ready&&expected.get(op.inputBlankId)?.phase!=='primary')fail('strip feed before primary rip completion');
   const d=dimensions(b);if(op.stage!==b.stage||op.machineOrientation!==b.q*90||op.w!==d.w||op.h!==d.h||!equal(op.materialRect,b.rect))fail('feed coordinates');
   limits(b);active=op.inputBlankId;feeds++;trace.push({step:op.step,type:op.type,blankId:active,machineOrientation:b.q*90});continue;
  }
  if(active!==op.inputBlankId)fail('blank must be explicitly fed');
  if(op.type==='rotate'){
   if(b.root){
    if(ready||(sheetCutCounts.get(b.sheet)??0)!==0||b.turns>=profile.maxSheetTurns)fail('original-sheet turn limit');
   }else{
    if(!ready)fail('premature strip rotation before primary rip completion');
    if(!profile.allowStripRotation||b.turns>=profile.maxTurnsPerBlank)fail('blank turn limit: second rotation forbidden');
   }
   if(op.turnCountBefore!==b.turns||op.turnCountAfter!==b.turns+1||!Array.isArray(op.outputBlankIds)||op.outputBlankIds.length!==1||op.outputBlankIds[0]!==op.inputBlankId)fail('rotation counter transition');
   const before=dimensions(b);
   if(!op.beforeSize||op.beforeSize.w!==before.w||op.beforeSize.h!==before.h||!equal(op.materialRect,b.rect)||op.axis!==null||op.start!==null||op.end!==null)fail('rotation snapshot');
   if(op.angle!==90||op.stage!==b.stage||op.fromOrientation!==b.q*90||op.toOrientation!==(b.q+1)%4*90)fail('rotation transform');
   b.q=(b.q+1)%4;registry.get(op.inputBlankId).machineOrientation=b.q*90;b.turns++;registry.get(op.inputBlankId).turnCount=b.turns;turns++;const d=dimensions(b);
   if(!op.afterSize||op.afterSize.w!==d.w||op.afterSize.h!==d.h||op.w!==d.w||op.h!==d.h||JSON.stringify(op.machineGrain)!==JSON.stringify(vector(b.q)))fail('rotated dimensions/texture');
   if(b.turns>1)fail('second rotation forbidden for same blankId');
   limits(b);trace.push({step:op.step,type:op.type,blankId:active,materialRect:{...b.rect},machineOrientation:b.q*90,machineGrain:vector(b.q)});continue;
  }
  if(op.type!=='cut')fail('unknown operation');
  const e=expected.get(op.inputBlankId);
  if(!e||consumed.has(op.inputBlankId)||op.phase!==e.phase||op.geometryCutNumber!==e.geometryCutNumber)fail('cut does not correspond to staged tree');
  if((!ready&&e.phase!=='primary')||(ready&&e.phase==='primary'))fail('transverse cut before primary separation / late rip');
  if(!profile.machineCutAxes.includes(op.axis)||op.machineOrientation!==b.q*90||op.kerf!==p.kerf||op.cutIndex!==cuts+1)fail('machine axis/orientation/kerf/cut numbering');
  const dim=dimensions(b);
  if(op.w!==dim.w||op.h!==dim.h||!equal(op.materialRect,b.rect)||op.turnCount!==b.turns||JSON.stringify(op.outputTurnCounts)!=='[0,0]')fail('cut snapshot or child turn counter reset');
  const mv=op.axis==='V',pos=mv?op.start?.x:op.start?.y,span=mv?dim.w:dim.h,len=mv?dim.h:dim.w;
  if(!Number.isFinite(pos)||!op.start||!op.end||op.start.x!==(mv?pos:0)||op.start.y!==(mv?0:pos)||
   op.end.x!==(mv?pos:dim.w)||op.end.y!==(mv?dim.h:pos)||pos<0||pos+p.kerf>span||len<=0)fail('local machine coordinates/full-span cut');
  if(profile.maxCutLength!==null&&len>profile.maxCutLength)fail('stroke limit');
  limits(b);
  // Invert quarter-turn transform, independently of the planner's mapping.
  let axis,reverse;
  switch(b.q){
   case 0:axis=op.axis;reverse=false;break;
   case 1:axis=mv?'H':'V';reverse=mv;break;
   case 2:axis=op.axis;reverse=true;break;
   case 3:axis=mv?'H':'V';reverse=!mv;break;
  }
  const r=b.rect,materialSpan=axis==='V'?r.w:r.h,d=reverse?materialSpan-pos-p.kerf:pos;
  const materialPos=(axis==='V'?r.x:r.y)+d;
  if(axis!==e.axis||materialPos!==e.pos||op.materialAxis!==axis||op.materialPos!==materialPos)fail('material/machine coordinate mismatch');
  const ids=reverse?[e.ids[1],e.ids[0]]:e.ids;
  if(!Array.isArray(op.outputBlankIds)||JSON.stringify(op.outputBlankIds)!==JSON.stringify(ids))fail('output blanks/rotation handedness');
  const stage=e.phase==='primary'?1:b.stage+(axis===b.lastAxis?0:1);
  if(op.stage!==stage||(profile.maxStages!==null&&stage>profile.maxStages))fail('stage limit/number');
  if(e.phase==='primary'){
   if(!sheetOrientation.has(b.sheet))sheetOrientation.set(b.sheet,b.q);
   if(b.q!==sheetOrientation.get(b.sheet)||axis!=='V'||r.y!==0||r.h!==p.sheetH)fail('primary axes alternated');
  }
  const children=axis==='V'?[{...r,w:d},{...r,x:materialPos+p.kerf,w:r.w-d-p.kerf}]:[{...r,h:d},{...r,y:materialPos+p.kerf,h:r.h-d-p.kerf}];
  if(children.some(a=>a.w<0||a.h<0))fail('negative child');
  live.delete(op.inputBlankId);consumed.add(op.inputBlankId);
  e.ids.forEach((id,j)=>put(id,{rect:children[j],q:b.q,stage,lastAxis:axis,sheet:b.sheet,parent:op.inputBlankId,turns:0,root:false,createdStep:op.step}));
  cuts++;sheetCutCounts.set(b.sheet,(sheetCutCounts.get(b.sheet)??0)+1);cutLength+=len;stages=Math.max(stages,stage);
  if(e.phase==='primary')primaryCuts++;
  if(e.phase==='strip-trim')trimCuts++;
  if(e.phase==='layout'&&!op.inputBlankId.endsWith('/work')&&!stripLists.get(b.sheet).includes(op.inputBlankId))substripInputs.add(op.inputBlankId);
  active=null;
  trace.push({step:op.step,type:'cut',cutIndex:cuts,inputBlankId:op.inputBlankId,stage,machineAxis:op.axis,
   materialAxis:axis,materialPos,materialRect:{...r},machineOrientation:b.q*90,outputBlankIds:op.outputBlankIds.slice()});
 }
 if(loaded.size!==layout.sheets.length||primaryDone.size!==layout.sheets.length||consumed.size!==expected.size)fail('missing operations or stages');
 if(plan.outputs.length!==live.size||live.size!==terminals.size)fail('missing outputs');
 const seen=new Set();
 for(const o of plan.outputs){
  const b=live.get(o.blankId),e=terminals.get(o.blankId);
  if(!b||!e||seen.has(o.blankId)||!equal(o.materialRect,b.rect)||o.parentBlankId!==b.parent||o.kind!==e.kind||
   o.turnCount!==b.turns||o.materialOrientation!==0||o.machineOrientation!==b.q*90||JSON.stringify(o.materialGrain)!=='[1,0]'||
   JSON.stringify(o.machineGrain)!==JSON.stringify(vector(b.q)))fail('output geometry/orientation/texture');
  if(e.kind==='part'&&(!o.part||o.part.id!==e.part.id||o.part.instance!==e.part.instance||o.part.rotated!==e.part.rotated))fail('part texture/identity');
  seen.add(o.blankId);
 }
 const metrics={primaryStrips:declared.length,substrips:substripInputs.size,stages:layout.sheets.length?stages:0,turns,
  parts:geometry.partCount,cuts,primaryCuts,stripTrimCuts:trimCuts,cutLength,feeds,operations:plan.operations.length};
 if(profile.maxStages!==null&&metrics.stages>profile.maxStages)fail('stage limit');
 return {geometryValid:true,stagedPlanValid:true,machineProfileValid:true,conditional:true,profileId:profile.id,metrics,trace,blanks:[...registry.values()]};
}
function assessStaged(p,layout,plan,profile){
 try{validate(p,layout);}catch(e){return {geometryValid:false,stagedPlanValid:false,machineProfileValid:false,reason:e.message};}
 try{return validateStaged(p,layout,plan,profile);}
 catch(e){
  const relaxed={...profile,allowSheetRotation:true,sheetRotationAllowed:true,maxSheetTurns:1,maxTurnsPerBlank:1,allowStripRotation:true,stripReorientationAllowed:true,
   machineCutAxes:['V','H'],maxStripTurns:1,maxStages:null,maxCutLength:null,maxFeedWidth:null,maxFeedHeight:null,minimumHoldWidth:0,minimumHoldHeight:0};
  let stagedPlanValid=false;
  try{validateStaged(p,layout,plan,relaxed);stagedPlanValid=true;}catch{}
  return {geometryValid:true,stagedPlanValid,machineProfileValid:false,reason:e.message};
 }
}
module.exports={validateStaged,assessStaged};

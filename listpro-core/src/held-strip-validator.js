'use strict';
// No optimizer/compiler imports. Material cuts are reconstructed by physical
// replay; which side stays in place is fixed by this profile, never by blank IDs.
const {replayPhysical}=require('./physical-replay');
function auditHeld(p,layout,plan,profile){
 if(profile.retainedSide!=='HIGH_MATERIAL')throw Error('Unsupported retained side');
 const r=replayPhysical(p,layout,plan,profile),errors=[],states=new Map(),closed=new Set(),bandIds=new Map();
 const output=new Map(plan.outputs.map(o=>[o.blankId,o])),frames=[],partTurns=[];
 const fail=(step,code,blankId,detail)=>errors.push({step,code,blankId,detail});
 let heldTurns=0,sheetTurns=0;
 const parts=(si,rect)=>layout.sheets[si].parts.filter(a=>a.x>=rect.x&&a.y>=rect.y&&a.x+a.w<=rect.x+rect.w&&a.y+a.h<=rect.y+rect.h);
 const future=new Map();
 for(const e of r.events)if(['cut','rotate'].includes(e.op.type)){const list=future.get(e.op.inputBlankId)||[];list.push(e.op.step);future.set(e.op.inputBlankId,list);}
 for(const e of r.events){
  const o=e.op,id=o.inputBlankId;
  if(o.type==='load'){
   states.set(o.blankId,{held:true,lock:profile.firstCutAxis,q:0,primary:true,turns:0,sheet:o.sheet,role:'HELD_SHEET',depth:0});
   bandIds.set(o.sheet,[]);continue;
  }
  if(o.type==='FINAL_REMAINDER_AS_STRIP'){fail(o.step,'RETAINED_PROMOTION_FORBIDDEN',id,'No promotion at any recursion level');continue;}
  if(o.type==='endPrimary'){
   if(closed.has(o.sheet))fail(o.step,'DUPLICATE_PRIMARY_END',null);
   if(JSON.stringify(o.stripBlankIds)!==JSON.stringify(bandIds.get(o.sheet)))fail(o.step,'PRIMARY_BANDS_MISMATCH',null);
   const tail=states.get(o.remainderBlankId),out=output.get(o.remainderBlankId);
   if(!tail?.held||!tail.primary||!out||out.kind==='part')fail(o.step,'PRIMARY_TAIL_NOT_DECLARED',o.remainderBlankId);
   closed.add(o.sheet);continue;
  }
  const b=states.get(id);if(!b){fail(o.step,'MISSING_ROLE',id);continue;}
  if(o.type==='feed'){
   const expected=b.held?'advance-in-place':'load-detached';
   if(o.feedMode!==expected)fail(o.step,'FEED_MODE',id,expected);
   if(!b.held){
    for(const [bid,t]of states)if(t.held&&(future.get(bid)||[]).some(step=>step>o.step)){
     fail(o.step,'UNFINISHED_RIP_SERIES',id,'Still processing '+bid);break;
    }
   }continue;
  }
  if(o.type==='rotate'){
   if(b.held){heldTurns++;if(b.primary)sheetTurns++;fail(o.step,'HELD_REMAINDER_ROTATION',id,{lock:b.lock,rect:e.before.rect});}
   if(!closed.has(b.sheet))fail(o.step,'ROTATION_BEFORE_PRIMARY_END',id);
   if(r.blanks.find(a=>a.blankId===id).turnCount>Math.min(1,profile.maxTurnsPerBlank??1))fail(o.step,'SECOND_PHYSICAL_ROTATION',id);
   b.turns++;b.q=(b.q+1)%4;continue;
  }
  if(o.type!=='cut')continue;
  const axis=e.materialAxis,rr=e.before.rect,children=e.materialOutputs,v=axis==='V',pos=e.materialPos;
  const coord=v?rr.x:rr.y,length=v?rr.w:rr.h,raw=v?p.sheetW:p.sheetH;
  for(const a of parts(b.sheet,rr)){const start=v?a.x:a.y,end=start+(v?a.w:a.h);
   if(Math.max(start,pos)<Math.min(end,pos+p.kerf))fail(o.step,'CUT_INTERSECTS_ORDERED_PART',id,{part:a.id,instance:a.instance});
  }
  if(b.held&&(axis!==b.lock||e.before.q!==b.q))fail(o.step,'RETAINED_DIRECTION_CHANGED',id,{expected:b.lock,actual:axis});
  const declaredTrim=o.phase==='strip-trim'||o.phase==='primary';
  const leadingTrim=declaredTrim&&coord===0&&pos===p.trim-p.kerf;
  const farTrim=o.phase==='strip-trim'&&coord+length===raw&&pos===raw-p.trim;
  if(o.phase==='strip-trim'&&!leadingTrim&&!farTrim)fail(o.step,'FAKE_EDGE_TRIM',id);
  states.delete(id);
  if(leadingTrim||farTrim){
   const keep=farTrim?0:1,drop=1-keep;
   if(parts(b.sheet,children[drop].rect).length)fail(o.step,'TRIM_CONTAINS_PART',id);
   states.set(children[keep].id,{...b,held:true,lock:axis,q:e.before.q,role:b.primary?'HELD_SHEET':'HELD_STRIP'});
   states.set(children[drop].id,{...b,held:true,lock:axis,q:e.before.q,role:'TRIM'});
  }else{
   const detached=children[0],retained=children[1],contained=parts(b.sheet,detached.rect);
   const cross=a=>v?a.w:a.h;
   if(contained.length&&!contained.some(a=>cross(a)===cross(detached.rect)))fail(o.step,'NO_REAL_STRIP_SPAN',detached.id);
   if(!contained.length&&(future.get(detached.id)||[]).length)fail(o.step,'MACHINING_EMPTY_STRIP',detached.id);
   if(b.primary){
    if(axis!==profile.firstCutAxis||e.before.q!==0)fail(o.step,'PRIMARY_DIRECTION_CHANGED',id);
    if(cross(retained.rect)<=p.kerf)fail(o.step,'ARTIFICIAL_PRIMARY_TAIL',retained.id);
    bandIds.get(b.sheet).push(detached.id);
   }else if(!closed.has(b.sheet))fail(o.step,'SECONDARY_BEFORE_PRIMARY_END',id);
   states.set(detached.id,{held:false,lock:null,q:e.before.q,primary:false,turns:b.turns,sheet:b.sheet,role:'DETACHED',depth:b.depth+1});
   states.set(retained.id,{...b,held:true,lock:axis,q:e.before.q,role:b.primary?'HELD_SHEET':'HELD_STRIP'});
  }
  frames.push({step:o.step,cut:o.cutIndex,input:id,inputRole:b.role,axis,outputs:children.map(c=>({...c,role:states.get(c.id).role,held:states.get(c.id).held}))});
 }
 for(const o of plan.outputs)if(o.kind==='part')partTurns.push({part:o.part,turns:states.get(o.blankId)?.turns??0});
 // A second, structural check independent of operation/group metadata.
 function tree(n,path){if(n.kind!=='cut')return;
  if(n.second.kind==='cut'&&n.second.axis!==n.axis)fail(null,'TREE_RETAINED_AXIS_CHANGE',path);
  tree(n.first,path+'/0');tree(n.second,path+'/1');
 }
 layout.sheets.forEach((sh,i)=>tree(sh.tree,'sheet'+i));
 return {geometryValid:true,abstractCutTreeValid:true,targetPSSModelValid:errors.length===0,
  realMachineFeasibility:'unknown',errors,metrics:{...r.metrics,heldRemainderTurns:heldTurns,originalSheetTurns:sheetTurns,ancestryTurnsMax:Math.max(0,...partTurns.map(a=>a.turns))},
  partTurns,roleFrames:frames,primarySnapshots:frames.filter(f=>f.inputRole==='HELD_SHEET'),
  assumptions:['Material LOW side is detached, HIGH side remains in place in every rip series.',
   'Every working strip width has a real detail span; this is the conservative tested profile.',
   'Feed advance-in-place means indexing the retained piece, not unloading it.',
   'Physical stroke, clamp and feeding limits remain unspecified.']};
}
function validateHeld(p,layout,plan,profile){
 const r=auditHeld(p,layout,plan,profile);
 if(!r.targetPSSModelValid)throw Error('Held-strip replay: '+r.errors.map(e=>e.step+' '+e.code).join('; '));
 return r;
}
module.exports={auditHeld,validateHeld};

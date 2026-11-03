'use strict';
// Compiler only. The independent replay imports neither this file nor the search.
function makeDeferredPlan(p,layout){
 const operations=[],outputs=[],primaryStrips=[],groups=[],states=new Map();let active=null,cutIndex=0;
 const add=o=>operations.push({step:operations.length+1,...o}),dims=b=>b.q%2?{w:b.rect.h,h:b.rect.w}:{w:b.rect.w,h:b.rect.h};
 function feed(id){const b=states.get(id);if(active===id)return;add({type:'feed',inputBlankId:id,stage:b.stage,machineOrientation:b.q*90,...dims(b),materialRect:{...b.rect},feedMode:b.held?'advance-in-place':'load-detached'});active=id;}
 function rotate(id){feed(id);const b=states.get(id);if(b.held||b.turnCount>=1)throw Error('Illegal rotation');const beforeSize=dims(b),from=b.q;b.q=(b.q+1)%4;b.turnCount++;b.ancestry++;
  add({type:'rotate',inputBlankId:id,outputBlankIds:[id],stage:b.stage,angle:90,fromOrientation:from*90,toOrientation:b.q*90,beforeSize,afterSize:dims(b),...dims(b),turnCountBefore:0,turnCountAfter:1,materialRect:{...b.rect}});
 }
 function finish(id,n){const b=states.get(id);if(!b)throw Error('Missing output');outputs.push({blankId:id,parentBlankId:b.parent,kind:n.kind==='part'?'part':'waste',materialRect:{...b.rect},machineOrientation:b.q*90,turnCount:b.turnCount,...(n.kind==='part'?{part:{...n.part}}:{})});}
 function cut(id,n){
  feed(id);const b=states.get(id);let axis=b.q%2?(n.axis==='H'?'V':'H'):n.axis;
  if(axis!==b.machineAxis){rotate(id);axis=b.q%2?(n.axis==='H'?'V':'H'):n.axis;}
  const r=b.rect,v=n.axis==='V',distance=n.pos-(v?r.x:r.y),span=v?r.w:r.h,q=b.q;
  if(b.held&&b.lock!==n.axis)throw Error('Retained direction changed');
  const reverse=v?(q===2||q===3):(q===1||q===2),pos=reverse?span-distance-p.kerf:distance,d=dims(b),mv=axis==='V';
  const ids=[id+'/0',id+'/1'],edge=n.edgeFinish===true,materialIds=edge?[ids[0]]:ids,machineIds=reverse&&!edge?ids.slice().reverse():materialIds;
  const stage=b.stage+(n.axis===b.lastAxis?0:1);
  add({type:'cut',cutIndex:++cutIndex,inputBlankId:id,outputBlankIds:machineIds,axis,start:mv?{x:pos,y:0}:{x:0,y:pos},end:mv?{x:pos,y:d.h}:{x:d.w,y:pos},kerf:p.kerf,kerfUsed:n.kerfUsed,edgeFinish:edge,phase:n.phase,geometryCutNumber:n.number,materialAxis:n.axis,materialPos:n.pos,materialRect:{...r},machineOrientation:q*90,...d,stage,turnCount:b.turnCount,outputTurnCounts:edge?[b.turnCount]:[0,0]});
  states.delete(id);
  const lead=n.phase==='leading-trim';
  for(let i=0;i<materialIds.length;i++){
   const held=edge||i===1||lead,rect=i===0?n.first.rect:n.second.rect;
   states.set(materialIds[i],{rect:{...rect},q,turnCount:edge?b.turnCount:0,ancestry:b.ancestry,parent:id,held,lock:held?n.axis:null,stage,lastAxis:n.axis,machineAxis:b.machineAxis});
  }active=null;return materialIds;
 }
 function walk(node,id){
  if(node.kind!=='cut'){finish(id,node);return;}
  const group={rootBlankId:id,axis:node.axis,cutSteps:[],children:[]},pending=[];groups.push(group);let n=node,current=id;
  while(n.kind==='cut'&&n.axis===group.axis){const ids=cut(current,n);group.cutSteps.push(operations.length);pending.push([n.first,ids[0]]);if(n.edgeFinish){n=null;current=null;break;}n=n.second;current=ids[1];}
  if(n)pending.push([n,current]);group.children=pending.map(a=>a[1]);for(const [child,bid]of pending)walk(child,bid);
 }
 layout.sheets.forEach((sh,si)=>{
  const A=sh.axis,prefix='s'+si;let n=sh.tree,id=prefix+'/raw';
  states.set(id,{rect:{x:0,y:0,w:p.sheetW,h:p.sheetH},q:0,turnCount:0,ancestry:0,parent:null,held:true,lock:A,stage:1,lastAxis:A,machineAxis:A});
  add({type:'load',sheet:si,blankId:id,w:p.sheetW,h:p.sheetH,machineOrientation:0,initialCutAxis:A,stage:1});active=id;
  if(n.phase==='leading-trim'){const ids=cut(id,n);finish(ids[0],n.first);id=ids[1];n=n.second;}
  const pending=[];
  while(n.kind==='cut'&&n.phase==='primary'){
   const ids=cut(id,n);pending.push([n.first,ids[0]]);primaryStrips.push({sheet:si,stripIndex:pending.length,blankId:ids[0],materialRect:{...n.first.rect},nominalSpan:A==='H'?n.first.rect.h:n.first.rect.w});id=ids[1];n=n.second;
  }
  if(n.kind!=='waste')throw Error('Primary remainder is not waste');finish(id,n);add({type:'endPrimary',sheet:si,stripBlankIds:pending.map(a=>a[1]),remainderBlankId:id,stage:1});active=null;
  for(const [band,bid]of pending)walk(band,bid);
 });
 return{version:2,model:'deferred-staged-v1',operations,outputs,primaryStrips,groups};
}
module.exports={makeDeferredPlan};

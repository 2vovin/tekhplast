'use strict';
// Compiler only. The independent replay imports neither this file nor the search.
function makeCompletedPlan(p,layout){
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
  add({type:'cut',cutIndex:++cutIndex,inputBlankId:id,outputBlankIds:machineIds,axis,start:mv?{x:pos,y:0}:{x:0,y:pos},end:mv?{x:pos,y:d.h}:{x:d.w,y:pos},kerf:p.kerf,kerfUsed:n.kerfUsed,edgeFinish:edge,finishesPart:n.first.kind==='part',phase:n.phase,geometryCutNumber:n.number,materialAxis:n.axis,materialPos:n.pos,materialRect:{...r},machineOrientation:q*90,...d,stage,turnCount:b.turnCount,outputTurnCounts:edge?[b.turnCount]:[0,0]});
  states.delete(id);
  const lead=n.phase==='leading-trim'||n.phase==='trailing-trim';
  for(let i=0;i<materialIds.length;i++){
   const held=edge||i===1||lead,rect=i===0?n.first.rect:n.second.rect;
   states.set(materialIds[i],{rect:{...rect},q,turnCount:edge?b.turnCount:0,ancestry:b.ancestry,parent:id,held,lock:held?n.axis:null,stage,lastAxis:n.axis,machineAxis:b.machineAxis,primary:lead?b.primary:b.primary&&i===1});
  }active=null;return materialIds;
 }
 function hasParts(n){return n.kind==='part'||n.kind==='cut'&&(hasParts(n.first)||hasParts(n.second));}
 function walk(node,id){
  while(node.kind==='cut'&&['leading-trim','trailing-trim'].includes(node.phase)){
   const ids=cut(id,node),leading=node.phase==='leading-trim';finish(ids[leading?0:1],leading?node.first:node.second);id=ids[leading?1:0];node=leading?node.second:node.first;
  }
  if(node.kind!=='cut'){finish(id,node);return;}
  const primary=!!states.get(id).primary,group={id:'rip-'+groups.length,rootBlankId:id,axis:node.axis,primary,cutSteps:[],children:[]},pending=[];groups.push(group);
  add({type:'startRip',inputBlankId:id,seriesId:group.id,materialAxis:node.axis,primary,materialRect:{...states.get(id).rect},machineOrientation:states.get(id).q*90,...dims(states.get(id))});
  let n=node,current=id;
  while(n.kind==='cut'&&n.axis===group.axis&&!['leading-trim','trailing-trim'].includes(n.phase)){
   const ids=cut(current,n);group.cutSteps.push(operations.length);pending.push([n.first,ids[0]]);
   if(n.edgeFinish){n=null;current=null;break;}n=n.second;current=ids[1];
  }
  if(n)pending.push([n,current]);group.children=pending.map(a=>a[1]);
  const lastId=current||pending.at(-1)[1],last=states.get(lastId);
  add({type:'endRip',seriesId:group.id,inputBlankId:lastId,remainderBlankId:current,outputBlankIds:group.children,materialAxis:group.axis,primary,materialRect:{...last.rect},machineOrientation:last.q*90,...dims(last),turnCountBefore:last.turnCount,turnCountAfter:last.turnCount});
  if(current){const b=states.get(current);b.held=false;b.lock=null;b.primary=false;}
  else if(pending.length){const b=states.get(pending.at(-1)[1]);b.held=false;b.lock=null;}
  if(primary){for(const [child,bid]of pending){states.get(bid).primary=false;if(hasParts(child))primaryStrips.push({sheet:Number(id.split('/')[0].slice(1)),stripIndex:primaryStrips.filter(s=>s.sheet===Number(id.split('/')[0].slice(1))).length+1,blankId:bid,materialRect:{...child.rect},nominalSpan:group.axis==='H'?child.rect.h:child.rect.w});}}
  active=null;for(const [child,bid]of pending)walk(child,bid);
 }
 layout.sheets.forEach((sh,si)=>{
  const id='s'+si+'/raw',A=sh.axis;
  states.set(id,{rect:{x:0,y:0,w:p.sheetW,h:p.sheetH},q:0,turnCount:0,ancestry:0,parent:null,held:true,lock:A,stage:1,lastAxis:A,machineAxis:A,primary:true});
  add({type:'load',sheet:si,blankId:id,w:p.sheetW,h:p.sheetH,machineOrientation:0,initialCutAxis:A,stage:1});active=id;walk(sh.tree,id);
 });
 return{version:1,model:'completed-rip-v1',operations,outputs,primaryStrips,groups};
}
module.exports={makeCompletedPlan};

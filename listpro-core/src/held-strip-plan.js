'use strict';
const {validate}=require('./validator');
function makeHeldPlan(p,layout,profile){
 validate(p,layout);
 if(!profile||!['V','H'].includes(profile.firstCutAxis))throw Error('Choose primary axis');
 if(p.trim>0&&p.trim<p.kerf)throw Error('Trim smaller than kerf unsupported');
 const operations=[],states=new Map(),outputs=[],primaryStrips=[],groups=[];
 let active=null,cutIndex=0;
 const dimensions=b=>b.q%2?{w:b.rect.h,h:b.rect.w}:{w:b.rect.w,h:b.rect.h};
 const grain=q=>[[1,0],[0,1],[-1,0],[0,-1]][q];
 function add(op){operations.push({step:operations.length+1,...op});}
 function feed(id){
  const b=states.get(id);if(active===id)return;
  add({type:'feed',inputBlankId:id,stage:b.stage,machineOrientation:b.q*90,...dimensions(b),materialRect:{...b.rect},feedMode:b.held?'advance-in-place':'load-detached'});
  active=id;
 }
 function rotate(id){
  feed(id);const b=states.get(id),before=b.q;
  if(b.held)throw Error('Retained blank cannot rotate: '+id);
  if(b.turnCount>=profile.maxTurnsPerBlank)throw Error('Blank turn limit');
  b.turnCount++;b.q=(b.q+1)%4;
  add({type:'rotate',inputBlankId:id,stage:b.stage,angle:90,fromOrientation:before*90,toOrientation:b.q*90,...dimensions(b),machineGrain:grain(b.q),outputBlankIds:[id],turnCountBefore:0,turnCountAfter:1,
   beforeSize:before%2?{w:b.rect.h,h:b.rect.w}:{w:b.rect.w,h:b.rect.h},
   afterSize:dimensions(b),materialRect:{...b.rect},axis:null,start:null,end:null});
 }
 function cut(id,axis,pos,ids,phase,geoNumber=null){
  feed(id);const b=states.get(id),r=b.rect;
  let machineAxis=b.q%2?(axis==='V'?'H':'V'):axis;
  if(!profile.machineCutAxes.includes(machineAxis)){rotate(id);machineAxis=b.q%2?(axis==='V'?'H':'V'):axis;}
  const q=b.q,d=pos-(axis==='V'?r.x:r.y),span=axis==='V'?r.w:r.h;
  const reverse=axis==='V'?(q===2||q===3):(q===1||q===2);
  const machinePos=reverse?span-d-p.kerf:d,dim=dimensions(b),v=machineAxis==='V';
  const stage=phase==='primary'?1:b.stage+(axis===b.lastAxis?0:1);
  const rr=axis==='V'?[{...r,w:d},{...r,x:pos+p.kerf,w:span-d-p.kerf}]:[{...r,h:d},{...r,y:pos+p.kerf,h:span-d-p.kerf}];
  const machineIds=reverse?[ids[1],ids[0]]:ids.slice();
  add({type:'cut',stage,cutIndex:++cutIndex,inputBlankId:id,axis:machineAxis,
   start:v?{x:machinePos,y:0}:{x:0,y:machinePos},end:v?{x:machinePos,y:dim.h}:{x:dim.w,y:machinePos},
   kerf:p.kerf,outputBlankIds:machineIds,materialAxis:axis,materialPos:pos,phase,geometryCutNumber:geoNumber,
   machineOrientation:q*90,w:dim.w,h:dim.h,materialRect:{...r},
   turnCount:b.turnCount,outputTurnCounts:[0,0]});
  states.delete(id);ids.forEach((child,i)=>states.set(child,{rect:rr[i],q,stage,lastAxis:axis,parent:id,turnCount:0,held:phase==='strip-trim'?(i===(ids[0].endsWith('/edge0')?1:0)):i===1}));
  active=null;return ids;
 }
 function finish(id,kind,part){
  const b=states.get(id);
  outputs.push({blankId:id,parentBlankId:b.parent,kind,materialRect:{...b.rect},materialOrientation:0,machineOrientation:b.q*90,
   materialGrain:[1,0],machineGrain:grain(b.q),turnCount:b.turnCount,...(part?{part:{...part}}:{})});
 }

 layout.sheets.forEach((sh,si)=>{
  const A=sh.axis??profile.firstCutAxis;if(A!==profile.firstCutAxis)throw Error('Mixed loading axes');
  const P=A==='V'?'H':'V',v=A==='V',span=v?p.sheetW:p.sheetH,perp=v?p.sheetH:p.sheetW;
  const prefix='s'+si;let id=prefix+'/raw';
  states.set(id,{rect:{x:0,y:0,w:p.sheetW,h:p.sheetH},q:0,stage:1,lastAxis:A,parent:null,turnCount:0,held:true});
  add({type:'load',sheet:si,blankId:id,stage:1,machineOrientation:0,w:p.sheetW,h:p.sheetH});active=id;
  if(p.trim>0){
   cut(id,A,p.trim-p.kerf,[prefix+'/edge0',prefix+'/main0'],'primary');finish(prefix+'/edge0','trim-waste');id=prefix+'/main0';
  }
  const bands=sh.primaryStrips.slice(0,-1),strips=[];
  for(let i=0;i<bands.length;i++){
   const s=bands[i],sid=prefix+'/band'+(i+1),nominal=v?s.rect.w:s.rect.h,far=(v?s.rect.x:s.rect.y)+nominal;

   cut(id,A,far,[sid,prefix+'/main'+(i+1)],'primary');
   id=prefix+'/main'+(i+1);strips.push(sid);
   primaryStrips.push({sheet:si,stripIndex:i+1,blankId:strips[i],geometryPath:s.path,nominalSpan:nominal,materialRect:{...states.get(strips[i]).rect}});
  }
  finish(id,'trim-waste');
  add({type:'endPrimary',sheet:si,stage:1,stripBlankIds:strips.slice(),remainderBlankId:id});active=null;
  bands.forEach((s,i)=>{
   const sid=strips[i];let root=sid;
   if(p.trim>0){
    cut(root,P,p.trim-p.kerf,[sid+'/edge0',sid+'/trimmed0'],'strip-trim');finish(sid+'/edge0','trim-waste');root=sid+'/trimmed0';
    cut(root,P,perp-p.trim,[sid+'/work',sid+'/edge1'],'strip-trim');finish(sid+'/edge1','trim-waste');root=sid+'/work';
   }
   let tree=sh.tree;for(const bit of s.path.split('/').slice(1))tree=bit==='0'?tree.first:tree.second;
   // Finish a full parallel-cut series before machining its detached children.
   function walk(n,blank){
    if(n.kind!=='cut'){finish(blank,n.kind,n.part);return;}
    const group={rootBlankId:blank,axis:n.axis,cutSteps:[],children:[]};groups.push(group);
    const pending=[];let current=n,currentId=blank;
    while(current.kind==='cut'&&current.axis===group.axis){
     const ids=[currentId+'/0',currentId+'/1'];
     cut(currentId,current.axis,current.pos,ids,'layout',current.number);
     group.cutSteps.push(operations.length);pending.push([current.first,ids[0]]);
     current=current.second;currentId=ids[1];
    }
    pending.push([current,currentId]);group.children=pending.map(a=>a[1]);
    for(const [node,bid]of pending)walk(node,bid);
   }walk(tree,root);
  });
 });

 return {version:1,profileId:profile.id,model:'staged-panel-saw',operations,primaryStrips,outputs,groups};
}
module.exports={makeHeldPlan};

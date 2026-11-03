'use strict';
const {validate}=require('./validator');
function makeExamPlan(p,layout,profile){
 validate(p,layout);
 if(!profile||profile.firstCutAxis!=='V')throw Error('This staged generator supports firstCutAxis V only');
 if(p.trim>0&&p.trim<p.kerf)throw Error('Trim smaller than kerf unsupported');
 const operations=[],states=new Map(),outputs=[],primaryStrips=[];
 let active=null,cutIndex=0;
 const dimensions=b=>b.q%2?{w:b.rect.h,h:b.rect.w}:{w:b.rect.w,h:b.rect.h};
 const grain=q=>[[1,0],[0,1],[-1,0],[0,-1]][q];
 function add(op){operations.push({step:operations.length+1,...op});}
 function feed(id){
  const b=states.get(id);if(active===id)return;
  add({type:'feed',inputBlankId:id,stage:b.stage,machineOrientation:b.q*90,...dimensions(b),materialRect:{...b.rect}});
  active=id;
 }
 function rotate(id){
  feed(id);const b=states.get(id),before=b.q;
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
  states.delete(id);ids.forEach((child,i)=>states.set(child,{rect:rr[i],q,stage,lastAxis:axis,parent:id,turnCount:0}));
  active=null;return ids;
 }
 function finish(id,kind,part){
  const b=states.get(id);
  outputs.push({blankId:id,parentBlankId:b.parent,kind,materialRect:{...b.rect},materialOrientation:0,machineOrientation:b.q*90,
   materialGrain:[1,0],machineGrain:grain(b.q),turnCount:b.turnCount,...(part?{part:{...part}}:{})});
 }
 layout.sheets.forEach((sh,si)=>{
  const prefix='s'+si;let id=prefix+'/raw';
  states.set(id,{rect:{x:0,y:0,w:p.sheetW,h:p.sheetH},q:0,stage:1,lastAxis:'V',parent:null,turnCount:0});
  add({type:'load',sheet:si,blankId:id,stage:1,machineOrientation:0,w:p.sheetW,h:p.sheetH});active=id;
  if(p.trim>0){
   cut(id,'V',p.trim-p.kerf,[prefix+'/side0',prefix+'/side-rem'],'primary');finish(prefix+'/side0','trim-waste');id=prefix+'/side-rem';
   cut(id,'V',p.sheetW-p.trim,[prefix+'/body',prefix+'/side1'],'primary');finish(prefix+'/side1','trim-waste');id=prefix+'/body';
  }
  const strips=[];
  sh.primaryStrips.forEach((s,i)=>{
   const sid=prefix+'/strip'+(i+1);
   if(i<sh.primaryStrips.length-1){cut(id,'V',s.rect.x+s.rect.w,[sid,prefix+'/rip-rem'+i],'primary');id=prefix+'/rip-rem'+i;strips.push(sid);}
   else {finish(id,'waste');return;}
   primaryStrips.push({sheet:si,stripIndex:i+1,blankId:strips[i],geometryPath:s.path,
    materialRect:{...states.get(strips[i]).rect}});
  });
  add({type:'endPrimary',sheet:si,stage:1,stripBlankIds:strips.slice(),remainderBlankId:id});active=null;
  sh.primaryStrips.forEach((s,i)=>{
   if(i>=strips.length)return;
   const sid=strips[i];let root=sid;
   if(p.trim>0){
    cut(root,'H',p.trim-p.kerf,[sid+'/top',sid+'/after-top'],'strip-trim');finish(sid+'/top','trim-waste');root=sid+'/after-top';
    cut(root,'H',p.sheetH-p.trim,[sid+'/work',sid+'/bottom'],'strip-trim');finish(sid+'/bottom','trim-waste');root=sid+'/work';
   }
   let tree=sh.tree;for(const bit of s.path.split('/').slice(1))tree=bit==='0'?tree.first:tree.second;
   function walk(n,blank){
    if(n.kind==='cut'){
     const children=[blank+'/0',blank+'/1'];
     cut(blank,n.axis,n.pos,children,'layout',n.number);
     walk(n.first,children[0]);walk(n.second,children[1]);
    }else finish(blank,n.kind,n.part);
   }walk(tree,root);
  });
 });
 return {version:1,profileId:profile.id,model:'staged-panel-saw',operations,primaryStrips,outputs};
}
module.exports={makeExamPlan};

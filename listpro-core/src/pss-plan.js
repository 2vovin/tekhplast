'use strict';
const {validate}=require('./validator');
function makePSSPlan(p,layout,profile){
 validate(p,layout);
 const operations=[],outputs=[],primaryStrips=[],state=new Map();let active=null,cutIndex=0;
 const add=op=>operations.push({step:operations.length+1,...op});
 const dims=b=>b.q%2?{w:b.rect.h,h:b.rect.w}:{w:b.rect.w,h:b.rect.h};
 const grain=q=>[[1,0],[0,1],[-1,0],[0,-1]][q];
 function feed(id,purpose){
  if(active===id)return;const b=state.get(id);
  add({type:'feed',inputBlankId:id,purpose,stage:b.stage,machineOrientation:b.q*90,...dims(b),materialRect:{...b.rect}});active=id;
 }
 function rotate(id,purpose){
  feed(id,purpose);const b=state.get(id),before=b.q,oldSize=dims(b);
  if(b.turnCount>=1)throw Error('Second turn');
  b.q=(b.q+1)%4;b.turnCount++;
  add({type:'rotate',inputBlankId:id,outputBlankIds:[id],purpose,stage:b.stage,angle:90,fromOrientation:before*90,toOrientation:b.q*90,
   turnCountBefore:0,turnCountAfter:1,...dims(b),beforeSize:oldSize,afterSize:dims(b),machineGrain:grain(b.q),materialRect:{...b.rect}});
 }
 function cut(id,axis,pos,ids,phase,roles,extra={}){
  const b=state.get(id),purpose=phase.startsWith('PRIMARY')?'PRIMARY_REPOSITION':'WORKING_STRIP';
  feed(id,purpose);
  let ma=b.q%2?(axis==='V'?'H':'V'):axis;
  if(!profile.machineCutAxes.includes(ma)){rotate(id,purpose);ma=b.q%2?(axis==='V'?'H':'V'):axis;}
  const r=b.rect,q=b.q,v=axis==='V',span=v?r.w:r.h,d=pos-(v?r.x:r.y),reverse=v?(q===2||q===3):(q===1||q===2);
  const mp=reverse?span-d-p.kerf:d,dim=dims(b),mv=ma==='V';
  const rr=v?[{...r,w:d},{...r,x:pos+p.kerf,w:span-d-p.kerf}]:[{...r,h:d},{...r,y:pos+p.kerf,h:span-d-p.kerf}];
  const stage=phase.startsWith('PRIMARY')?1:b.stage+(axis===b.lastAxis?0:1);
  add({type:'cut',inputBlankId:id,outputBlankIds:reverse?[ids[1],ids[0]]:ids.slice(),inputRole:b.role,outputRoles:reverse?[roles[1],roles[0]]:roles.slice(),
   cutIndex:++cutIndex,phase,stage,axis:ma,start:mv?{x:mp,y:0}:{x:0,y:mp},end:mv?{x:mp,y:dim.h}:{x:dim.w,y:mp},
   kerf:p.kerf,materialAxis:axis,materialPos:pos,machineOrientation:q*90,w:dim.w,h:dim.h,materialRect:{...r},turnCount:b.turnCount,outputTurnCounts:[0,0],...extra});
  state.delete(id);ids.forEach((child,i)=>state.set(child,{rect:rr[i],q,turnCount:0,parent:id,stage,lastAxis:axis,role:roles[i]}));active=null;
 }
 function finish(id,kind,part){
  const b=state.get(id);
  outputs.push({blankId:id,parentBlankId:b.parent,kind,role:b.role,materialRect:{...b.rect},machineOrientation:b.q*90,turnCount:b.turnCount,
   materialOrientation:0,materialGrain:[1,0],machineGrain:grain(b.q),...(part?{part:{...part}}:{})});
 }
 layout.sheets.forEach((sh,si)=>{
  const prefix='s'+si,axis=sh.axis,transpose=axis==='H',U=transpose?p.sheetH:p.sheetW,V=transpose?p.sheetW:p.sheetH;
  const materialAxis=a=>transpose?(a==='V'?'H':'V'):a;
  let main=prefix+'/raw';state.set(main,{rect:{x:0,y:0,w:p.sheetW,h:p.sheetH},q:0,turnCount:0,parent:null,stage:1,lastAxis:axis,role:'PRIMARY_PANEL'});
  add({type:'load',sheet:si,blankId:main,stage:1,w:p.sheetW,h:p.sheetH,machineOrientation:0});active=main;
  if(p.trim===0&&sh.tree.kind==='part'&&sh.tree.rect.w===p.sheetW&&sh.tree.rect.h===p.sheetH){
   add({type:'endPrimary',sheet:si,stage:1,stripBlankIds:[],remainderBlankId:main});finish(main,'part',sh.tree.part);return;
  }
  if(!profile.machineCutAxes.includes(axis)){
   if(!profile.maxSheetTurns)throw Error('Initial sheet turn forbidden');rotate(main,'INITIAL_SHEET');
  }
  if(p.trim>0){
   cut(main,axis,p.trim-p.kerf,[prefix+'/side-low',prefix+'/main0'],'PRIMARY_TRIM',['WASTE','PRIMARY_REMAINDER']);
   finish(prefix+'/side-low','trim-waste');main=prefix+'/main0';
   cut(main,axis,U-p.trim,[prefix+'/main1',prefix+'/side-high'],'PRIMARY_TRIM',['PRIMARY_REMAINDER','WASTE']);
   finish(prefix+'/side-high','trim-waste');main=prefix+'/main1';
  }
  const ids=[];
  sh.primaryStrips.forEach((strip,i)=>{
   const id=prefix+'/strip'+(i+1),anchor={partId:strip.anchor.id,instanceId:strip.anchor.instance};
   if(strip.finalRemainder){
    add({type:'FINAL_REMAINDER_AS_STRIP',inputBlankId:main,outputBlankIds:[main],stage:1,anchor,allowance:0,feedDirection:'LONG_POSITIVE'});
    state.get(main).role='DETACHED_PRIMARY_STRIP';ids.push(main);main=null;
   }else{
    const r=strip.rect,low=transpose?r.y:r.x,pos=low-p.kerf,next=prefix+'/remainder'+i;
    cut(main,axis,pos,[next,id],'PRIMARY_CUT',['PRIMARY_REMAINDER','DETACHED_PRIMARY_STRIP'],{anchor,allowance:0,feedDirection:'LONG_POSITIVE'});
    ids.push(id);main=next;
   }
   primaryStrips.push({sheet:si,stripIndex:i+1,blankId:ids[i],axis,anchor,geometryPath:strip.path,materialRect:{...state.get(ids[i]).rect},finalRemainder:strip.finalRemainder});
  });
  add({type:'endPrimary',sheet:si,stage:1,stripBlankIds:ids.slice(),remainderBlankId:main});active=null;
  if(main)finish(main,'waste');
  sh.primaryStrips.forEach((strip,i)=>{
   const sid=ids[i];let work=sid;
   if(p.trim>0){
    cut(work,materialAxis('H'),p.trim-p.kerf,[sid+'/end-low',sid+'/after-low'],'STRIP_TRIM',['SECONDARY_BLANK','SECONDARY_BLANK']);
    finish(sid+'/end-low','trim-waste');work=sid+'/after-low';
    cut(work,materialAxis('H'),V-p.trim,[sid+'/work',sid+'/end-high'],'STRIP_TRIM',['SECONDARY_BLANK','SECONDARY_BLANK']);
    finish(sid+'/end-high','trim-waste');work=sid+'/work';
   }
   let node=sh.tree;for(const bit of strip.path.split('/').slice(1))node=bit==='0'?node.first:node.second;
   function walk(n,id){
    if(n.kind==='cut'){const children=[id+'/0',id+'/1'];cut(id,n.axis,n.pos,children,'WORKING_CUT',['SECONDARY_BLANK','SECONDARY_BLANK'],{geometryCutNumber:n.number});walk(n.first,children[0]);walk(n.second,children[1]);}
    else finish(id,n.kind,n.part);
   }walk(node,work);
  });
 });
 return {version:1,mode:'PANEL_SAW_STAGED',profileId:profile.id,operations,outputs,primaryStrips};
}
module.exports={makePSSPlan};

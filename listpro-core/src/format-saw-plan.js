'use strict';
const {validate}=require('./validator');
function makeFormatSawPlan(p,layout,profile){
 validate(p,layout);
 if(!profile||profile.mode!=='FORMAT_SAW')throw Error('FORMAT_SAW profile required');
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
  const beforeCount=b.turnCount;
  b.q=(b.q+1)%4;b.turnCount++;
  add({type:'rotate',inputBlankId:id,outputBlankIds:[id],purpose,stage:b.stage,angle:90,fromOrientation:before*90,toOrientation:b.q*90,
   turnCountBefore:beforeCount,turnCountAfter:b.turnCount,...dims(b),beforeSize:oldSize,afterSize:dims(b),machineGrain:grain(b.q),materialRect:{...b.rect}});
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
  const prefix='f'+si;let id=prefix+'/raw';
  state.set(id,{rect:{x:0,y:0,w:p.sheetW,h:p.sheetH},q:0,turnCount:0,parent:null,stage:1,lastAxis:'V',role:'FORMAT_BLANK'});
  add({type:'load',sheet:si,blankId:id,stage:1,w:p.sheetW,h:p.sheetH,machineOrientation:0});active=id;
  if(p.trim>0){
   if(p.trim<p.kerf)throw Error('Trim below kerf unsupported');
   const steps=[['V',p.trim-p.kerf,1],['V',p.sheetW-p.trim,0],['H',p.trim-p.kerf,1],['H',p.sheetH-p.trim,0]];
   steps.forEach(([axis,pos,keep],i)=>{
    const next=prefix+'/prep'+i,scrap=prefix+'/margin'+i,ids=keep===0?[next,scrap]:[scrap,next];
    cut(id,axis,pos,ids,'FORMAT',['FORMAT_BLANK','FORMAT_BLANK']);finish(scrap,'trim-waste');id=next;
   });
  }
  function walk(n,blank){
   if(n.kind==='cut'){const children=[blank+'/0',blank+'/1'];cut(blank,n.axis,n.pos,children,'FORMAT',['FORMAT_BLANK','FORMAT_BLANK']);walk(n.first,children[0]);walk(n.second,children[1]);}
   else finish(blank,n.kind,n.part);
  }walk(sh.tree,id);
 });
 return {version:1,mode:'FORMAT_SAW',profileId:profile.id,operations,outputs};
}
module.exports={makeFormatSawPlan};

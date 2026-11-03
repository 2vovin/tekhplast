'use strict';
const {validate}=require('./validator');
function makePlan(p,layout,profile){
 validate(p,layout);
 if(!profile||profile.allowSheetRotation!==false||profile.allowStripRotation!==false)throw Error('Planner supports fixed orientation profiles only');
 if(p.trim>0&&p.trim<p.kerf)throw Error('Trim smaller than kerf cannot be removed by this full-kerf model');
 const operations=[],outputs=[];
 const add=op=>operations.push({step:operations.length+1,...op});
 function emit(input,rect,axis,pos,children,phase,layoutCutNumber=null){
  const v=axis==='V',d=pos-(v?rect.x:rect.y);
  const a=v?{...rect,w:d}:{...rect,h:d};
  const b=v?{...rect,x:pos+p.kerf,w:rect.w-d-p.kerf}:{...rect,y:pos+p.kerf,h:rect.h-d-p.kerf};
  add({type:'cut',input,children,axis,pos,kerf:p.kerf,orientation:0,phase,layoutCutNumber,
   from:v?{x:pos,y:rect.y}:{x:rect.x,y:pos},
   to:v?{x:pos,y:rect.y+rect.h}:{x:rect.x+rect.w,y:pos},
   fixture:'in-situ-independent-clamps'});
  return [a,b];
 }
 layout.sheets.forEach((sh,si)=>{
  const prefix='s'+si;
  let id=prefix+'/raw',r={x:0,y:0,w:p.sheetW,h:p.sheetH};
  add({type:'load',sheet:si,blank:id,rect:{...r},orientation:0});
  if(p.trim>0){
   const trims=[['V',p.trim-p.kerf,1],['V',p.sheetW-p.trim,0],['H',p.trim-p.kerf,1],['H',p.sheetH-p.trim,0]];
   trims.forEach(([axis,pos,keep],i)=>{
    const next=i===3?prefix+'/r':prefix+'/trim'+i, scrap=prefix+'/scrap'+i;
    const children=keep===0?[next,scrap]:[scrap,next];
    const rects=emit(id,r,axis,pos,children,'trim');
    outputs.push({blank:scrap,kind:'trim-waste',rect:rects[1-keep],orientation:0});
    id=next;r=rects[keep];
   });
  }else{
   // Explicit alias is avoided: root is the loaded raw blank when trim is zero.
   id=prefix+'/raw';
  }
  function walk(n,blank){
   if(n.kind==='cut'){
    const children=[blank+'/0',blank+'/1'];
    emit(blank,n.rect,n.axis,n.pos,children,'layout',n.number);
    walk(n.first,children[0]);walk(n.second,children[1]);
   }else outputs.push({blank,kind:n.kind,rect:{...n.rect},orientation:0,...(n.kind==='part'?{part:{...n.part}}:{})});
  }
  walk(sh.tree,id);
 });
 return {version:1,profileId:profile.id,coordinateSystem:'sheet-fixed-top-left-mm',
  operations,outputs,rotationOperations:0};
}
module.exports={makePlan};

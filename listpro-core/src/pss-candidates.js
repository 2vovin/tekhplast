'use strict';
const {checkInput}=require('./core');
function rng(seed){let z=seed>>>0;return ()=>((z=(Math.imul(z,1664525)+1013904223)>>>0)/4294967296);}
function candidatePSS(p,ordered,axis,random,mode){
 const transpose=axis==='H',W=(transpose?p.sheetH:p.sheetW)-2*p.trim,H=(transpose?p.sheetW:p.sheetH)-2*p.trim,k=p.kerf,t=p.trim;
 const jobs=ordered.map(a=>({...a,l:transpose?a.w:a.l,w:transpose?a.l:a.w}));
 const sheets=[],free=[];
 const leaf=rect=>({kind:'waste',rect});
 function sheet(){
  const sh={tree:leaf({x:t,y:t,w:W,h:H}),primaryStrips:[],parts:[],axis};
  sh.remainder=sh.tree;sh.remainderPath='r';sheets.push(sh);return sh;
 }
 const fit=(r,o)=>r.w>=o.w&&r.h>=o.h&&(r.w===o.w||r.w-o.w>=k)&&(r.h===o.h||r.h-o.h>=k);
 function createStrip(job,o){
  let sh=sheets.find(s=>s.remainder&&((s.remainder.rect.w===o.w)||(s.remainder.rect.w-o.w>k)));
  if(!sh)sh=sheet();
  const rem=sh.remainder,r=rem.rect;
  if(o.w>r.w||o.h>H||(H!==o.h&&H-o.h<k)||(r.w!==o.w&&r.w-o.w<=k))return null;
  let strip,path,final=false;
  if(r.w===o.w){strip=rem;path=sh.remainderPath;sh.remainder=null;final=true;}
  else{
   const pos=r.x+r.w-o.w-k;
   rem.kind='cut';rem.axis='V';rem.pos=pos;rem.kerf=k;
   rem.first=leaf({...r,w:pos-r.x});rem.second=leaf({x:pos+k,y:t,w:o.w,h:H});
   strip=rem.second;path=sh.remainderPath+'/1';sh.remainder=rem.first;sh.remainderPath+='/0';
  }
  const anchor={id:job.id,instance:job.instance,rotated:o.rotated};
  sh.primaryStrips.push({index:sh.primaryStrips.length+1,path,rect:{...strip.rect},anchor,finalRemainder:final});
  const part=leaf({x:strip.rect.x,y:t,w:o.w,h:o.h});part.kind='part';part.part=anchor;
  if(o.h===H)Object.assign(strip,part);
  else{
   strip.kind='cut';strip.axis='H';strip.pos=t+o.h;strip.kerf=k;strip.first=part;
   strip.second=leaf({x:strip.rect.x,y:t+o.h+k,w:o.w,h:H-o.h-k});
   if(strip.second.rect.w>0&&strip.second.rect.h>0)free.push(strip.second);
  }
  return true;
 }
 for(const job of jobs){
  const orientations=[{w:job.l,h:job.w,rotated:false},...(job.grain===false?[{w:job.w,h:job.l,rotated:true}]:[])];
  let best=null;
  for(let i=0;!job.forcePrimaryAnchor&&i<free.length;i++)for(const o of orientations)if(fit(free[i].rect,o)){
   const r=free[i].rect,dw=r.w-o.w,dh=r.h-o.h;
   const score=mode%3===0?r.w*r.h-o.w*o.h:mode%3===1?Math.min(dw,dh):Math.max(dw,dh);
   if(!best||score<best.score)best={i,o,score};
  }
  if(!best){
   const valid=orientations.filter(o=>o.w<=W&&o.h<=H&&(H===o.h||H-o.h>=k));
   if(!valid.length)return null;
   const o=valid.find(o=>sheets.some(s=>s.remainder&&(s.remainder.rect.w===o.w||s.remainder.rect.w-o.w>k)))??valid[0];
   if(!createStrip(job,o))return null;continue;
  }
  let n=free.splice(best.i,1)[0],o=best.o;
  function split(node,cutAxis,size){
   const r=node.rect,v=cutAxis==='V',span=v?r.w:r.h;if(span===size)return node;
   node.kind='cut';node.axis=cutAxis;node.pos=(v?r.x:r.y)+size;node.kerf=k;
   node.first=leaf(v?{...r,w:size}:{...r,h:size});
   node.second=leaf(v?{...r,x:node.pos+k,w:span-size-k}:{...r,y:node.pos+k,h:span-size-k});
   if(node.second.rect.w>0&&node.second.rect.h>0)free.push(node.second);return node.first;
  }
  const v=random()<0.5;n=split(n,v?'V':'H',v?o.w:o.h);n=split(n,v?'H':'V',v?o.h:o.w);
  n.kind='part';n.part={id:job.id,instance:job.instance,rotated:o.rotated};
 }
 function materialRect(r){return transpose?{x:r.y,y:r.x,w:r.h,h:r.w}:{...r};}
 function transform(n){
  const out={...n,rect:materialRect(n.rect)};
  if(n.kind==='cut'){out.axis=transpose?(n.axis==='V'?'H':'V'):n.axis;out.first=transform(n.first);out.second=transform(n.second);}
  return out;
 }
 let number=0;
 for(const sh of sheets){
  sh.primaryRemainder=sh.remainder?{path:sh.remainderPath,rect:materialRect(sh.remainder.rect)}:null;
  sh.tree=transform(sh.tree);
  sh.primaryStrips=sh.primaryStrips.map(a=>({...a,axis,rect:materialRect(a.rect)}));
  delete sh.remainder;delete sh.remainderPath;
  sh.remnants=[];
  function visit(n){if(n.kind==='cut'){n.number=++number;visit(n.first);visit(n.second);}else if(n.kind==='part')sh.parts.push({...n.rect,...n.part});else sh.remnants.push({...n.rect,area:n.rect.w*n.rect.h});}
  visit(sh.tree);
 }
 return {mode:'PANEL_SAW_STAGED',version:'1.2',sheets,partCount:ordered.length,partOrder:ordered.map(a=>[a.id,a.instance]),optimality:'not proven'};
}
module.exports={candidatePSS,rng};

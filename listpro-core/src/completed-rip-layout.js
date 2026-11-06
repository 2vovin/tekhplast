'use strict';
// Separate model: edge preparation, parallel rip, explicit last-blank release.
const {dimensions}=require('./deferred-strip-patterns');
const {collect}=require('./pss-waste-local');
const {compareParts}=require('./ordered-strip-layout');
function buildCompletedLayout(p,patterns,{strategy='original',seed=42}={}){
 const k=p.kerf,counters=new Map();let rand=seed>>>0;
 const random=()=>((rand=(Math.imul(rand,1664525)+1013904223)>>>0)/4294967296);
 const waste=rect=>({kind:'waste',rect:{...rect}});
 function split(r,axis,size,first,second,phase='layout',allowFinish=false){
  const v=axis==='V',span=v?r.w:r.h;if(size<0||(size===0&&phase!=='leading-trim')||size>=span)throw Error('Invalid separation span');
  const used=Math.min(k,span-size),edgeFinish=span-size<=k&&phase!=='trailing-trim';
  if(edgeFinish&&!allowFinish)throw Error('A retained remainder cannot be promoted to a strip');
  const pos=(v?r.x:r.y)+size,a=v?{...r,w:size}:{...r,h:size},b=v?{...r,x:pos+used,w:span-size-used}:{...r,y:pos+used,h:span-size-used};
  const node={kind:'cut',rect:{...r},axis,pos,kerf:k,kerfUsed:used,edgeFinish,phase,first:first(a),second:second(b)};
  return node;
 }
 function leaf(n,r,held){
  if(r.w===n.w&&r.h===n.h){const instance=n.part.instance??((counters.get(n.part.id)||0)+1);counters.set(n.part.id,Math.max(counters.get(n.part.id)||0,instance));return{kind:'part',rect:{...r},part:{...n.part,instance}};}
  const bothEdge=r.w>n.w&&r.h>n.h&&r.w-n.w<=k&&r.h-n.h<=k;
  const axis=bothEdge&&held?held:r.w!==n.w&&(r.w-n.w>k||r.h===n.h||r.h-n.h<=k)?'V':'H';
  return split(r,axis,axis==='V'?n.w:n.h,rr=>leaf(n,rr,null),waste,'layout',true);
 }
 function place(n,r,held=null){
  if(n.w>r.w||n.h>r.h)throw Error('Pattern exceeds blank');if(n.part)return leaf(n,r,held);
  const axis=n.axis,dim=axis==='V'?'w':'h',cross=axis==='V'?'h':'w';

  const kids=n.children.slice();if(strategy==='area-desc')kids.sort(compareParts);
  if(strategy==='size-desc')kids.sort((a,b)=>b[dim]-a[dim]);
  if(strategy==='size-asc')kids.sort((a,b)=>a[dim]-b[dim]);
  if(strategy==='shuffle')for(let i=kids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[kids[i],kids[j]]=[kids[j],kids[i]];}
  // The final workpiece can continue only after an explicit, replayed END_RIP.

  function line(i,rr){
   if(i===kids.length)return waste(rr);const c=kids[i],size=c[dim];
   if(i===kids.length-1&&rr[dim]-size<=k)return place(c,rr,axis);
   return split(rr,axis,size,a=>place(c,a,axis),b=>line(i+1,b),'layout',!!c.part&&c[cross]===rr[cross]&&i===kids.length-1);
  }return line(0,r);
 }
 function trimEnds(r,axis,next){
  if(!p.trim)return next(r);
  const v=axis==='V',far=(v?p.sheetW:p.sheetH)-p.trim;
  return split(r,axis,p.trim-k,waste,a=>split(a,axis,far-(v?a.x:a.y),b=>next(b),waste,'trailing-trim'),'leading-trim');
 }
 const sheets=patterns.map(pattern=>{
  let n=dimensions(pattern,p.kerf);if(n.part)n={axis:'H',children:[n],w:n.w,h:n.h};
  const A=n.axis,P=A==='H'?'V':'H',dim=A==='H'?'h':'w',primaryStrips=[];
  if(n.w>p.sheetW-2*p.trim||n.h>p.sheetH-2*p.trim)throw Error('Pattern exceeds usable sheet');
  const children=n.children.slice();if(strategy==='size-desc')children.sort((a,b)=>b[dim]-a[dim]);if(strategy==='size-asc')children.sort((a,b)=>a[dim]-b[dim]);
  function series(i,r,path){
   if(i===children.length)return waste(r);const c=children[i];
   function band(rr){primaryStrips.push({index:i+1,rect:{...rr},path});return trimEnds(rr,P,a=>place(c,a,P));}
   if(i===children.length-1&&r[dim]-c[dim]<=k)return band(r);
   return split(r,A,c[dim],band,b=>series(i+1,b,path+'/1'),'primary');
  }
  const rect={x:0,y:0,w:p.sheetW,h:p.sheetH},tree=trimEnds(rect,A,r=>series(0,r,'r'));
  return {axis:A,tree,primaryStrips};
 });
 const layout=collect({model:'completed-rip-v1',sheets,method:'recursive-strips-with-explicit-series-completion',optimality:'not proven'});
 // Remnants exposed in the UI are useful intersections, not raw edge trimmings.
 for(const sh of layout.sheets)sh.remnants=sh.remnants.map(a=>{const x=Math.max(p.trim,a.x),y=Math.max(p.trim,a.y),w=Math.max(0,Math.min(p.sheetW-p.trim,a.x+a.w)-x),h=Math.max(0,Math.min(p.sheetH-p.trim,a.y+a.h)-y);return{x,y,w,h,area:w*h};}).filter(a=>a.area>0);
 return layout;
}
module.exports={buildCompletedLayout};

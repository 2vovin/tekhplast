'use strict';
// New arrangement pass. Historical search/builders and the independent replay
// are unchanged. Groups stay together; only siblings inside a strip move.
const {dimensions,fromTree}=require('./deferred-strip-patterns');
const {collect}=require('./pss-waste-local');
const {verifyDeferred}=require('./deferred-strip-search');
function rank(n){
 if(n.part)return[n.w*n.h,Math.max(n.w,n.h),Math.min(n.w,n.h)];
 return n.children.map(rank).sort((a,b)=>b[0]-a[0]||b[1]-a[1]||b[2]-a[2])[0];
}
function compareParts(a,b){const x=rank(a),y=rank(b);return y[0]-x[0]||y[1]-x[1]||y[2]-x[2];}
function buildOrderedLayout(p,patterns){
 const k=p.kerf,counters=new Map(),exceptions=[];let sheetIndex=0,orderedGroups=0;
 const waste=rect=>({kind:'waste',rect:{...rect}});
 function split(r,axis,size,first,second,phase='layout',allowFinish=false){
  const v=axis==='V',span=v?r.w:r.h;if(size<=0||size>=span)throw Error('Invalid separation span');
  const used=Math.min(k,span-size),edgeFinish=span-size<=k;
  if(edgeFinish&&!allowFinish)throw Error('A retained remainder cannot be promoted to a strip');
  const pos=(v?r.x:r.y)+size,a=v?{...r,w:size}:{...r,h:size},b=v?{...r,x:pos+used,w:span-size-used}:{...r,y:pos+used,h:span-size-used};
  const node={kind:'cut',rect:{...r},axis,pos,kerf:k,kerfUsed:used,edgeFinish,phase,first:first(a),second:second(b)};
  if(edgeFinish&&node.first.kind!=='part')throw Error('Overhanging blade allowed only for terminal part sizing');return node;
 }
 function leaf(n,r,held){
  if(r.w===n.w&&r.h===n.h){const instance=n.part.instance??((counters.get(n.part.id)||0)+1);counters.set(n.part.id,instance);return{kind:'part',rect:{...r},part:{...n.part,instance}};}
  const axis=r.w!==n.w?'V':'H';if(held&&held!==axis)throw Error('Retained leaf cannot change direction');
  return split(r,axis,axis==='V'?n.w:n.h,rr=>leaf(n,rr,null),waste,'layout',true);
 }
 function place(n,r,held=null){
  if(n.w>r.w||n.h>r.h)throw Error('Pattern exceeds blank');if(n.part)return leaf(n,r,held);
  const axis=n.axis,dim=axis==='V'?'w':'h',cross=axis==='V'?'h':'w';
  if(held&&held!==axis)throw Error('Retained group cannot change direction');
  const kids=n.children.slice().sort(compareParts);orderedGroups++;
  // A terminal child with no positive far-side offcut stays held. It must be
  // a full-cross-span finished part, not a group needing another direction.
  const spare=r[dim]-(kids.reduce((s,c)=>s+c[dim],0)+k*(kids.length-1));
  const last=kids.at(-1),terminal=c=>c.part&&c[cross]===r[cross];
  if(spare<=k&&!terminal(last)){
   const index=kids.findLastIndex(terminal);
   if(index<0)throw Error('No finished terminal anchor for the sorted rip');
   const anchor=kids.splice(index,1)[0];kids.push(anchor);
   exceptions.push({sheet:sheetIndex,axis,rect:{...r},part:{...anchor.part},reason:'Retained final piece must finish without another turn.'});
  }
  function line(i,rr){
   if(i===kids.length)return waste(rr);const c=kids[i],size=c[dim];
   if(rr[dim]===size){if(i!==kids.length-1)throw Error('Missing strip space');return place(c,rr,axis);}
   return split(rr,axis,size,a=>place(c,a),b=>line(i+1,b),'layout',!!c.part&&c[cross]===rr[cross]&&i===kids.length-1);
  }return line(0,r);
 }
 const sheets=patterns.map((pattern,si)=>{sheetIndex=si;
  let n=dimensions(pattern,p.kerf);if(n.part)n={axis:'H',children:[n],w:n.w,h:n.h};
  const A=n.axis,P=A==='H'?'V':'H',dim=A==='H'?'h':'w',primaryStrips=[];
  if(n.w>p.sheetW-2*p.trim||n.h>p.sheetH-2*p.trim)throw Error('Pattern exceeds usable sheet');
  const children=n.children.slice(); // Keep primary strips in their original order.
  function series(i,r,path){
   if(i===children.length)return waste(r);const c=children[i];
   function band(rr){primaryStrips.push({index:i+1,rect:{...rr},path:path+'/0'});return p.trim?split(rr,P,p.trim-k,waste,a=>place(c,a,P),'leading-trim'):place(c,rr);}
   return split(r,A,c[dim],band,b=>series(i+1,b,path+'/1'),'primary');
  }
  const rect={x:0,y:0,w:p.sheetW,h:p.sheetH},tree=p.trim?split(rect,A,p.trim-k,waste,r=>series(0,r,'r/1'),'leading-trim'):series(0,rect,'r');
  return {axis:A,tree,primaryStrips};
 });
 const layout=collect({model:'deferred-staged-v1',sheets,method:'descending-parts-within-existing-strips',optimality:'not proven',ordering:{mode:'descending',criterion:'largest real part area, then longest side',orderedGroups,exceptions}});
 // Remnants exposed in the UI are useful intersections, not raw edge trimmings.
 for(const sh of layout.sheets)sh.remnants=sh.remnants.map(a=>{const x=Math.max(p.trim,a.x),y=Math.max(p.trim,a.y),w=Math.max(0,Math.min(p.sheetW-p.trim,a.x+a.w)-x),h=Math.max(0,Math.min(p.sheetH-p.trim,a.y+a.h)-y);return{x,y,w,h,area:w*h};}).filter(a=>a.area>0);
 return layout;
}

function arrange(result,mode='descending'){
 if(!['descending','optimized'].includes(mode))throw Error('Unknown strip ordering');
 if(mode==='optimized')return {...result,ordering:{mode}};
 const p=result.parameters,patterns=result.sheets.map(sh=>{const n=fromTree(sh.tree,p.kerf);return n.axis===sh.axis?n:{axis:sh.axis,children:[n]};});
 try{
  const s=verifyDeferred(p,buildOrderedLayout(p,patterns));
  // Sheet allocations and original per-copy identities must remain unchanged.
  const identities=sh=>sh.parts.map(a=>a.id+':'+a.instance+':'+a.w+':'+a.h+':'+!!a.rotated).sort().join('|');
  if(s.sheets.length!==result.sheets.length||s.sheets.some((sh,i)=>identities(sh)!==identities(result.sheets[i])))throw Error('Sorting changed sheet allocation');
  return {...s,search:result.search};
 }catch(e){return {...result,ordering:{mode,applied:false,reason:e.message}};}
}
module.exports={arrange,buildOrderedLayout,compareParts};

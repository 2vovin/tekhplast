'use strict';
// Patterns contain real instances/groups, never synthetic anchor details.
const {collect}=require('./pss-waste-local');
function dimensions(n,k){
 if(n.part)return n;
 const children=n.children.flatMap(c=>c.axis===n.axis?c.children:[c]).map(c=>dimensions(c,k));
 if(!children.length)throw Error('Empty pattern');if(children.length===1)return children[0];
 return {...n,children,w:n.axis==='V'?children.reduce((s,c)=>s+c.w,0)+k*(children.length-1):Math.max(...children.map(c=>c.w)),h:n.axis==='H'?children.reduce((s,c)=>s+c.h,0)+k*(children.length-1):Math.max(...children.map(c=>c.h))};
}
function fromDiagram(p,n){
 if(n.id!==undefined){const a=p.pieces.find(a=>a.id===n.id);if(!a)throw Error('Unknown part in reference');const b=n.bbox,w=b[2]-b[0],h=b[3]-b[1];const rotated=a.grain===false&&Math.abs(w/h-a.w/a.l)<Math.abs(w/h-a.l/a.w);return{part:{id:a.id,rotated},w:rotated?a.w:a.l,h:rotated?a.l:a.w};}
 return dimensions({axis:n.axis,children:n.children.map(c=>fromDiagram(p,c))},p.kerf);
}
function fromTree(n,k){
 if(n.kind==='waste')return null;if(n.kind==='part')return{part:{...n.part},w:n.rect.w,h:n.rect.h};
 const children=[],axis=n.axis;let t=n;
 while(t.kind==='cut'&&t.axis===axis){const c=fromTree(t.first,k);if(c)children.push(c);t=t.second;}
 const last=fromTree(t,k);if(last)children.push(last);
 if(!children.length)return null;return dimensions({axis,children},k);
}
function countParts(n,out=new Map()){if(n.part)out.set(n.part.id,(out.get(n.part.id)||0)+1);else n.children.forEach(c=>countParts(c,out));return out;}
function buildRawLayout(p,patterns,{strategy='anchor-last',seed=42}={}){
 const k=p.kerf,counters=new Map();let rand=seed>>>0;
 const random=()=>((rand=(Math.imul(rand,1664525)+1013904223)>>>0)/4294967296);
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
  if(r.w===n.w&&r.h===n.h){const instance=(counters.get(n.part.id)||0)+1;counters.set(n.part.id,instance);return{kind:'part',rect:{...r},part:{...n.part,instance}};}
  const axis=r.w!==n.w?'V':'H';if(held&&held!==axis)throw Error('Retained leaf cannot change direction');
  return split(r,axis,axis==='V'?n.w:n.h,rr=>leaf(n,rr,null),waste,'layout',true);
 }
 function place(n,r,held=null){
  if(n.w>r.w||n.h>r.h)throw Error('Pattern exceeds blank');if(n.part)return leaf(n,r,held);
  const axis=n.axis,dim=axis==='V'?'w':'h',cross=axis==='V'?'h':'w';
  if(held&&held!==axis)throw Error('Retained group cannot change direction');
  const kids=n.children.slice();
  if(strategy==='size-desc')kids.sort((a,b)=>b[dim]-a[dim]);
  if(strategy==='size-asc')kids.sort((a,b)=>a[dim]-b[dim]);
  if(strategy==='shuffle')for(let i=kids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[kids[i],kids[j]]=[kids[j],kids[i]];}
  // A final retained piece may finish directly; never turn it into a new strip.
  const anchors=kids.map((c,i)=>({c,i})).filter(({c})=>c.part&&c[cross]===r[cross]);
  if(anchors.length)kids.push(kids.splice(anchors.at(-1).i,1)[0]);
  function line(i,rr){
   if(i===kids.length)return waste(rr);const c=kids[i],size=c[dim];
   if(rr[dim]===size){if(i!==kids.length-1)throw Error('Missing strip space');return place(c,rr,axis);}
   return split(rr,axis,size,a=>place(c,a),b=>line(i+1,b),'layout',!!c.part&&c[cross]===rr[cross]&&i===kids.length-1);
  }return line(0,r);
 }
 const sheets=patterns.map(pattern=>{
  let n=dimensions(pattern,p.kerf);if(n.part)n={axis:'H',children:[n],w:n.w,h:n.h};
  const A=n.axis,P=A==='H'?'V':'H',dim=A==='H'?'h':'w',primaryStrips=[];
  if(n.w>p.sheetW-2*p.trim||n.h>p.sheetH-2*p.trim)throw Error('Pattern exceeds usable sheet');
  const children=n.children.slice();if(strategy==='size-desc')children.sort((a,b)=>b[dim]-a[dim]);if(strategy==='size-asc')children.sort((a,b)=>a[dim]-b[dim]);
  function series(i,r,path){
   if(i===children.length)return waste(r);const c=children[i];
   function band(rr){primaryStrips.push({index:i+1,rect:{...rr},path:path+'/0'});return p.trim?split(rr,P,p.trim-k,waste,a=>place(c,a,P),'leading-trim'):place(c,rr);}
   return split(r,A,c[dim],band,b=>series(i+1,b,path+'/1'),'primary');
  }
  const rect={x:0,y:0,w:p.sheetW,h:p.sheetH},tree=p.trim?split(rect,A,p.trim-k,waste,r=>series(0,r,'r/1'),'leading-trim'):series(0,rect,'r');
  return {axis:A,tree,primaryStrips};
 });
 const layout=collect({model:'deferred-staged-v1',sheets,method:'recursive-strip-patterns-with-deferred-end-trim',optimality:'not proven'});
 // Remnants exposed in the UI are useful intersections, not raw edge trimmings.
 for(const sh of layout.sheets)sh.remnants=sh.remnants.map(a=>{const x=Math.max(p.trim,a.x),y=Math.max(p.trim,a.y),w=Math.max(0,Math.min(p.sheetW-p.trim,a.x+a.w)-x),h=Math.max(0,Math.min(p.sheetH-p.trim,a.y+a.h)-y);return{x,y,w,h,area:w*h};}).filter(a=>a.area>0);
 return layout;
}
module.exports={fromDiagram,fromTree,dimensions,countParts,buildRawLayout};

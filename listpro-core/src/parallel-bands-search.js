'use strict';
const {checkInput}=require('./core');
const {validate}=require('./validator');
const {collect}=require('./pss-waste-local');
const {linearDP,families,random}=require('./recursive-strip');
const key=j=>JSON.stringify([j.id,j.instance]);
function trial(p,jobs,config,rng,stats){
 const k=p.kerf,W=p.sheetW-2*p.trim,H=p.sheetH-2*p.trim;
 const left=new Map(jobs.map(j=>[key(j),j]));
 const priority=new Map(families(jobs).flatMap(group=>{const v=0.15+2*rng();return group.map(j=>[key(j),v]);}));
 const waste=r=>({kind:'waste',rect:{...r}});
 const fit=(span,size)=>size<=span&&(span===size||span-size>=k);
 function divide(r,axis,size,a,b){
  const v=axis==='V',span=v?r.w:r.h;
  if(size===span)return a(r);
  const pos=(v?r.x:r.y)+size,ra=v?{...r,w:size}:{...r,h:size};
  const rb=v?{...r,x:pos+k,w:span-size-k}:{...r,y:pos+k,h:span-size-k};
  return {kind:'cut',rect:{...r},axis,pos,kerf:k,first:a(ra),second:b(rb)};
 }
 function fill(r,depth=0){
  stats.rectangles++;
  if(!r.w||!r.h||!left.size)return waste(r);
  const orientations=[];
  for(const j of left.values()){
   if(fit(r.w,j.l)&&fit(r.h,j.w))orientations.push({j,w:j.l,h:j.w,rotated:false});
   if(j.grain===false&&j.l!==j.w&&fit(r.w,j.w)&&fit(r.h,j.l))orientations.push({j,w:j.w,h:j.l,rotated:true});
  }
  if(!orientations.length)return waste(r);
  // Seeded candidate family and direction. delta affects membership, never dimensions.
  const axis=rng()<config.vertical?'V':'H',v=axis==='V';
  orientations.sort((a,b)=>b.w*b.h*priority.get(key(b.j))-a.w*a.h*priority.get(key(a.j)));
  const anchor=orientations[Math.min(orientations.length-1,Math.floor(rng()*config.choices))];
  const thick=v?anchor.w:anchor.h,cap=v?r.h:r.w;
  let eligible=orientations.filter(o=>{
   const t=v?o.w:o.h;return t>=thick*(1-config.delta)&&fit(thick,t);
  });
  // Each physical instance may enter the linear subproblem only once.
  const used=new Set();eligible=eligible.filter(o=>{const id=key(o.j);if(used.has(id))return false;used.add(id);return true;});
  const items=eligible.map(o=>({o,length:v?o.h:o.w,value:o.w*o.h*priority.get(key(o.j))}));
  let selected;
  if(config.dp&&items.length<=64){
   const d=linearDP(items,cap,k);selected=d.items;stats.dpCalls++;stats.dpStates+=d.states;if(!d.exact)stats.prunedDP++;
  }else{
   selected=[];let length=0;
   for(const it of items){const n=length+it.length+(selected.length?k:0);if(n<=cap&&(n===cap||cap-n>=k)){selected.push(it);length=n;}}
  }
  if(!selected.length)selected=[items.find(i=>key(i.o.j)===key(anchor.j))||items[0]];
  selected.sort((a,b)=>config.reverse?a.length-b.length:b.length-a.length);
  for(const it of selected)left.delete(key(it.o.j));
  function line(rr,index){
   if(index===selected.length)return fill(rr,depth+1);
   const o=selected[index].o,sz=v?o.h:o.w;
   return divide(rr,v?'H':'V',sz,cell=>
    divide(cell,axis,v?o.w:o.h,part=>({kind:'part',rect:{...part},part:{id:o.j.id,instance:o.j.instance,rotated:o.rotated}}),slack=>fill(slack,depth+1)),
    tail=>line(tail,index+1));
  }
  return divide(r,axis,thick,strip=>line(strip,0),rest=>fill(rest,depth+1));
 }
 const sheets=[];
 while(left.size){
  const before=left.size;
  const bands=config.bands;let rect={x:p.trim,y:p.trim,w:W,h:H};const primaryStrips=[];
  function compose(i,r,path){
   if(i===bands.length){primaryStrips.push({index:i+1,rect:{...r},path});return waste(r);}
   const h=bands[i];if(h>r.h||r.h-h<k)throw Error('bands');
   const rr={...r,h}; primaryStrips.push({index:i+1,rect:rr,path:path+'/0'});
   return divide(r,'H',h,ss=>fill(ss),tail=>compose(i+1,tail,path+'/1'));
  }
  sheets.push({tree:compose(0,rect,'r'),primaryStrips});
  if(left.size===before)return null; // Unsupported width/reservation, not infeasibility.
 }
 return collect({sheets,method:'recursive-strip-brain-2.0',optimality:'not proven'});
}
function transpose(s) {
 for(const sh of s.sheets) {
  function rect(r){return {x:r.y,y:r.x,w:r.h,h:r.w};}
  function walk(n){n.rect=rect(n.rect);if(n.kind==='cut'){n.axis=n.axis==='H'?'V':'H';walk(n.first);walk(n.second);}}
  walk(sh.tree);sh.primaryStrips.forEach(a=>a.rect=rect(a.rect));sh.axis='V';
 }return collect(s);
}
function normalize(s,k){
 function count(n){return n.kind==='part'?1:n.kind==='waste'?0:count(n.first)+count(n.second);}
 function only(n){return n.kind==='part'?n: n.kind==='cut'?(only(n.first)||only(n.second)):null;}
 function walk(n,axis){
  if(n.kind!=='cut')return n;
  if(count(n)===1){
   const p=only(n);if(p.rect.x===n.rect.x&&p.rect.y===n.rect.y){
    function crop(r,axes){if(!axes.length)return {...p,rect:{...r}};const ax=axes[0],v=ax==='V',size=v?p.rect.w:p.rect.h,span=v?r.w:r.h;
     if(size===span)return crop(r,axes.slice(1));const pos=(v?r.x:r.y)+size;
     return {kind:'cut',rect:{...r},axis:ax,pos,kerf:k,first:crop(v?{...r,w:size}:{...r,h:size},axes.slice(1)),
      second:{kind:'waste',rect:v?{...r,x:pos+k,w:span-size-k}:{...r,y:pos+k,h:span-size-k}}};
    } return crop(n.rect,[axis,axis==='V'?'H':'V']);
   }
  }
  n.first=walk(n.first,n.axis);n.second=walk(n.second,n.axis);return n;
 }
 
 function lead(n){
  if(n.kind!=='cut')return n;
  const axis=n.axis,nodes=[];let t=n;
  while(t.kind==='cut'&&t.axis===axis){nodes.push(t.first);t=t.second;}nodes.push(t);
  nodes.sort((a,b)=>Number(b.kind==='part')-Number(a.kind==='part'));
  function shift(a,x,y){const dx=x-a.rect.x,dy=y-a.rect.y;function go(z){z.rect.x+=dx;z.rect.y+=dy;if(z.kind==='cut'){z.pos+=z.axis==='V'?dx:dy;go(z.first);go(z.second);}}go(a);return a;}
  function join(i,r){const a=shift(nodes[i],r.x,r.y);if(i===nodes.length-1)return a;const v=axis==='V',size=v?a.rect.w:a.rect.h,pos=(v?r.x:r.y)+size;
   return {kind:'cut',rect:{...r},axis,pos,kerf:k,first:a,second:join(i+1,v?{...r,x:pos+k,w:r.w-size-k}:{...r,y:pos+k,h:r.h-size-k})};
  }return join(0,n.rect);
 }
 for(const sh of s.sheets){

  for(const band of sh.primaryStrips.slice(0,-1)){
   const bits=band.path.split('/').slice(1);let parent=sh.tree;
   for(const bit of bits.slice(0,-1))parent=bit==='0'?parent.first:parent.second;
   const side=bits[bits.length-1]==='0'?'first':'second';parent[side]=lead(walk(parent[side],sh.axis??'H'));
  }
 }

 return collect(s);
}
function searchBands(p,{iterations=20000,seed=42,bandSets,axis='H',accept}={}){
 if(!['H','V'].includes(axis)||!Number.isSafeInteger(iterations)||iterations<1||!Array.isArray(bandSets)||!bandSets.length)throw Error('Search arguments');
 const dims=new Set(p.pieces.map(a=>axis==='H'?a.w:a.l));
 for(const bands of bandSets)if(!bands.length||bands.some(x=>!dims.has(x))||bands.reduce((a,b)=>a+b+p.kerf,0)> (axis==='H'?p.sheetH:p.sheetW)-2*p.trim)throw Error('Bands must use real order dimensions and fit');
 const pp=axis==='H'?p:{...p,sheetW:p.sheetH,sheetH:p.sheetW,pieces:p.pieces.map(a=>({...a,l:a.w,w:a.l}))};
 const jobs=checkInput(pp).jobs,rng=random(seed),stats={seed,iterations,axis,rectangles:0,dpCalls:0,dpStates:0,prunedDP:0,oneSheet:0,elapsedMs:0};
 let best=null,bestScore=null;const t=Date.now();
 for(let i=0;i<iterations;i++){
  const bands=bandSets[i%bandSets.length].slice();
  for(let j=bands.length-1;j>0;j--){const q=Math.floor(rng()*(j+1));[bands[j],bands[q]]=[bands[q],bands[j]];}
  const config={delta:[0,.2,.5,.99][i%4],dp:i%3===0,vertical:(i%7)/6,choices:1+i%3,reverse:!!(i%2),primary:0,bands};
  let s=trial(pp,jobs,config,rng,stats);if(!s)continue;
  if(axis==='V')s=transpose(s);else s.sheets.forEach(sh=>sh.axis='H');
  s=normalize(s,p.kerf);const g=validate(p,s);if(g.sheets===1)stats.oneSheet++;
  const score=[g.sheets,g.cuts,-g.largestWaste,g.cutLength];
  if(!bestScore||score.some((a,j)=>a<bestScore[j]&&score.slice(0,j).every((b,q)=>b===bestScore[q]))){if(accept&&!accept(s))continue;best=s;bestScore=score;best.searchCandidate={iteration:i,config,axis};}
 }
 if(!best)throw Error('No candidate found; not an infeasibility proof');
 stats.elapsedMs=Date.now()-t;return {best,stats};
}
module.exports={searchBands,normalize};

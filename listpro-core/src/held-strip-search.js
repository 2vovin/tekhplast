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
 function fill(r,depth=0,forced=null){
  stats.rectangles++;
  if(!r.w||!r.h||!left.size)return waste(r);
  const orientations=[];
  for(const j of left.values()){
   if(fit(r.w,j.l)&&fit(r.h,j.w))orientations.push({j,w:j.l,h:j.w,rotated:false});
   if(j.grain===false&&j.l!==j.w&&fit(r.w,j.w)&&fit(r.h,j.l))orientations.push({j,w:j.w,h:j.l,rotated:true});
  }
  if(!orientations.length)return waste(r);
  // Seeded candidate family and direction. delta affects membership, never dimensions.
  const chosen=rng()<config.vertical?'V':'H',axis=forced??chosen,v=axis==='V';
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
   if(index===selected.length)return fill(rr,depth+1,v?'H':'V');
   const o=selected[index].o,sz=v?o.h:o.w;
   return divide(rr,v?'H':'V',sz,cell=>
    divide(cell,axis,v?o.w:o.h,part=>({kind:'part',rect:{...part},part:{id:o.j.id,instance:o.j.instance,rotated:o.rotated}}),slack=>fill(slack,depth+1,axis)),
    tail=>line(tail,index+1));
  }
  return divide(r,axis,thick,strip=>line(strip,0),rest=>fill(rest,depth+1,axis));
 }
 const sheets=[];
 while(left.size){
  const before=left.size;
  const bands=config.bands;let rect={x:p.trim,y:p.trim,w:W,h:H};const primaryStrips=[];
  function compose(i,r,path){
   if(i===bands.length){primaryStrips.push({index:i+1,rect:{...r},path});return waste(r);}
   const h=bands[i];if(h>r.h||r.h-h<k)throw Error('bands');
   const rr={...r,h}; primaryStrips.push({index:i+1,rect:rr,path:path+'/0'});
   return divide(r,'H',h,ss=>fill(ss,0,'V'),tail=>compose(i+1,tail,path+'/1'));
  }
  sheets.push({tree:compose(0,rect,'r'),primaryStrips});
  if(left.size===before)return null; // Unsupported width/reservation, not infeasibility.
 }
 return collect({sheets,method:'held-remainder-strips-v1',optimality:'not proven'});
}
function transpose(s) {
 for(const sh of s.sheets) {
  function rect(r){return {x:r.y,y:r.x,w:r.h,h:r.w};}
  function walk(n){n.rect=rect(n.rect);if(n.kind==='cut'){n.axis=n.axis==='H'?'V':'H';walk(n.first);walk(n.second);}}
  walk(sh.tree);sh.primaryStrips.forEach(a=>a.rect=rect(a.rect));sh.axis='V';
 }return collect(s);
}
function searchHeldStrips(p,{iterations=20000,seed=42,bandSets,axis='H',accept}={}){
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
  if(!heldTree(s)){stats.heldTreeRejected=(stats.heldTreeRejected||0)+1;continue;}const g=validate(p,s);if(g.sheets===1)stats.oneSheet++;
  const score=[g.sheets,g.cuts,-g.largestWaste,g.cutLength];
  if(!bestScore||score.some((a,j)=>a<bestScore[j]&&score.slice(0,j).every((b,q)=>b===bestScore[q]))){if(accept&&!accept(s))continue;best=s;bestScore=score;best.searchCandidate={iteration:i,config,axis};}
 }
 if(!best)throw Error('No candidate found; not an infeasibility proof');
 stats.elapsedMs=Date.now()-t;return {best,stats};
}

function heldTree(s){
 function ok(n){return n.kind!=='cut'||(n.second.kind!=='cut'||n.second.axis===n.axis)&&ok(n.first)&&ok(n.second);}
 return s.sheets.every(sh=>ok(sh.tree));
}
module.exports={searchHeldStrips,heldTree};


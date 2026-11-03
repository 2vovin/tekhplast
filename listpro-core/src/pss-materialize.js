'use strict';
// Expand count-DP groups to actual ordered instances, full-span cuts and real anchors.
function materializePSS(p,families,configs,allocation,random=()=>0){
 const k=p.kerf,t=p.trim,queues=families.map(f=>f.jobs.slice()),strips=[],sheets=[];
 const leaf=rect=>({kind:'waste',rect:{...rect}});
 function cut(rect,axis,pos,first,second){return {kind:'cut',rect:{...rect},axis,pos,kerf:k,first,second};}
 function embed(pattern,r){
  if(!pattern)return leaf(r);
  if(pattern.w>r.w||pattern.h>r.h||(r.w!==pattern.w&&r.w-pattern.w<k)||(r.h!==pattern.h&&r.h-pattern.h<k))throw Error('Pattern padding below kerf');
  const axes=random()<0.5?['V','H']:['H','V'];
  function trim(i,rect){
   if(i===2)return expand(pattern,rect);
   const axis=axes[i],v=axis==='V',size=v?pattern.w:pattern.h,span=v?rect.w:rect.h;
   if(span===size)return trim(i+1,rect);
   const pos=(v?rect.x:rect.y)+size,a=v?{...rect,w:size}:{...rect,h:size},
    b=v?{...rect,x:pos+k,w:span-size-k}:{...rect,y:pos+k,h:span-size-k};
   return cut(rect,axis,pos,trim(i+1,a),leaf(b));
  }
  return trim(0,r);
 }
 function expand(a,r){
  if(a.type!==undefined){
   const job=queues[a.type].shift();if(!job)throw Error('Pattern consumes missing instance');
   return {kind:'part',rect:{...r},part:{id:job.id,instance:job.instance,rotated:!!a.rotated}};
  }
  const v=a.axis==='V',pos=(v?r.x:r.y)+(v?a.a.w:a.a.h),
   ra=v?{...r,w:a.a.w}:{...r,h:a.a.h},
   rb=v?{...r,x:pos+k,w:r.w-a.a.w-k}:{...r,y:pos+k,h:r.h-a.a.h-k};
  return cut(r,a.axis,pos,embed(a.a,ra),embed(a.b,rb));
 }
 // Reserve every genuine anchor before consuming any secondary pattern.
 for(const c of configs)for(const a of c.anchors){const job=queues[a.type].shift();if(!job)throw Error('Duplicate/missing anchor');strips.push({a,job});}
 let cursor=0;
 for(const c of configs){
  const axis=c.axis,v=axis==='V',sh={axis,parts:[],remnants:[],primaryStrips:[],tree:leaf({x:t,y:t,w:p.sheetW-2*t,h:p.sheetH-2*t})};
  let rem=sh.tree,path='r';
  for(let i=0;i<c.anchors.length;i++,cursor++){
   const {a,job}=strips[cursor],r=rem.rect,span=v?r.w:r.h;
   const anchor={id:job.id,instance:job.instance,rotated:!!a.rotated},final=span===a.w;
   let node,stripPath;
   if(final){node=rem;stripPath=path;rem=null;}
   else{
    if(span-a.w<=k)throw Error('Invalid primary width');
    const pos=(v?r.x:r.y)+span-a.w-k;
    Object.assign(rem,cut(r,axis,pos,leaf(v?{...r,w:span-a.w-k}:{...r,h:span-a.w-k}),leaf(v?{...r,x:pos+k,w:a.w}:{...r,y:pos+k,h:a.w})));
    node=rem.second;stripPath=path+'/1';rem=rem.first;path+='/0';
   }
   sh.primaryStrips.push({index:i+1,path:stripPath,rect:{...node.rect},anchor,finalRemainder:final,axis});
   const sr=node.rect,long=v?sr.h:sr.w,partRect=v?{...sr,h:a.h}:{...sr,w:a.h},
    head={kind:'part',rect:partRect,part:anchor};
   if(long===a.h){if(allocation[cursor].pattern)throw Error('Nonempty zero tail');Object.assign(node,head);}
   else{
    const pos=(v?sr.y:sr.x)+a.h,tail=v?{...sr,y:pos+k,h:long-a.h-k}:{...sr,x:pos+k,w:long-a.h-k};
    Object.assign(node,cut(sr,v?'H':'V',pos,head,embed(allocation[cursor].pattern,tail)));
   }
  }
  sh.primaryRemainder=rem?{path,rect:{...rem.rect}}:null;sheets.push(sh);
 }
 if(queues.some(q=>q.length))throw Error('Missing parts in repaired allocation');
 let number=0;
 for(const sh of sheets){
  function visit(n){if(n.kind==='cut'){n.number=++number;visit(n.first);visit(n.second);}else if(n.kind==='part')sh.parts.push({...n.rect,...n.part});else sh.remnants.push({...n.rect,area:n.rect.w*n.rect.h});}visit(sh.tree);
 }
 return {version:'1.3',mode:'PANEL_SAW_STAGED',sheets,partCount:families.reduce((s,f)=>s+f.jobs.length,0),optimality:'not proven'};
}
function tailBins(p,configs){
 return configs.flatMap(c=>c.anchors.map(a=>{
  const long=(c.axis==='H'?p.sheetW:p.sheetH)-2*p.trim,tail=long===a.h?0:long-a.h-p.kerf;
  return c.axis==='H'?{w:tail,h:a.w}:{w:a.w,h:tail};
 }));
}
module.exports={materializePSS,tailBins};

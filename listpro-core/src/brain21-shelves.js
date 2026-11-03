'use strict';
// Depth-bounded candidate: detached primary panel -> rows -> cells -> parts.
// A material H/V/H path needs at most three rotations with the base V-only
// machine, including strip-end trimming. No stage/ancestry counters are trusted
// for acceptance; the independent replay still checks every result.
const {linearDP}=require('./recursive-strip');
const {collect}=require('./pss-waste-local');
function shelfTrial(p,jobs,rng){
 const k=p.kerf,W=p.sheetW-2*p.trim-2*k,H=p.sheetH-2*p.trim;
 const remaining=jobs.slice(),sheets=[],fit=(span,size)=>size<=span&&(size===span||span-size>=k);
 const waste=r=>({kind:'waste',rect:{...r}});
 function split(r,axis,size,first,second){
  const v=axis==='V',span=v?r.w:r.h;if(size===span)return first(r);
  const pos=(v?r.x:r.y)+size,ra=v?{...r,w:size}:{...r,h:size},rb=v?{...r,x:pos+k,w:span-size-k}:{...r,y:pos+k,h:span-size-k};
  return {kind:'cut',rect:{...r},axis,pos,kerf:k,first:first(ra),second:second(rb)};
 }
 while(remaining.length){
  const before=remaining.length,rows=[];let cap=H;
  while(cap>0){
   const candidates=remaining.flatMap((j,index)=>[{j,index,w:j.l,h:j.w,rotated:false},...(j.grain===false?[{j,index,w:j.w,h:j.l,rotated:true}]:[])])
    .filter(o=>fit(W,o.w)&&fit(cap,o.h)).sort((a,b)=>b.h-a.h||b.w-a.w);
   if(!candidates.length)break;
   const height=candidates[Math.min(candidates.length-1,Math.floor(rng()*3))].h,seen=new Set();
   const eligible=candidates.filter(o=>fit(height,o.h)&&!seen.has(o.index)&&seen.add(o.index));
   const items=eligible.map(o=>({o,length:o.w,value:o.w*o.h*(0.8+0.4*rng())}));
   let selected;
   if(items.length<=64)selected=linearDP(items,W,k).items.map(i=>i.o);
   else{selected=[];let width=0;for(const it of items){const next=width+(selected.length?k:0)+it.o.w;if(fit(W,next)){selected.push(it.o);width=next;}}}
   if(!selected.length)break;
   selected.sort((a,b)=>b.w-a.w||b.h-a.h);
   rows.push({height,items:selected});cap-=height+(height===cap?0:k);
   const indices=selected.map(o=>o.index).sort((a,b)=>b-a);for(const i of indices)remaining.splice(i,1);
  }
  if(remaining.length===before)return null;
  function cells(row,i,r){
   if(i===row.items.length)return waste(r);const o=row.items[i];
   return split(r,'V',o.w,cell=>split(cell,'H',o.h,part=>({kind:'part',rect:{...part},part:{id:o.j.id,instance:o.j.instance,rotated:o.rotated}}),waste),tail=>cells(row,i+1,tail));
  }
  function rowTree(i,r){
   if(i===rows.length)return waste(r);return split(r,'H',rows[i].height,head=>cells(rows[i],0,head),tail=>rowTree(i+1,tail));
  }
  const rect={x:p.trim,y:p.trim,w:W+2*k,h:H},strip={...rect,w:W},remainder={...rect,x:rect.x+W+k,w:k};
  sheets.push({tree:{kind:'cut',rect,axis:'V',pos:rect.x+W,kerf:k,first:rowTree(0,strip),second:waste(remainder)},
   primaryStrips:[{index:1,rect:strip,path:'r/0'},{index:2,rect:remainder,path:'r/1'}]});
 }
 return collect({sheets,method:'brain21-bounded-shelves'});
}
module.exports={shelfTrial};
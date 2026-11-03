'use strict';
const {candidate,widthsFor}=require('./strip-candidates');
// Physical instances are partitioned, never duplicated, into bounded grid blocks.
function buildGrid(instances,columns,kerf,columnFirst=false){
 const first=instances[0],rows=Math.ceil(instances.length/columns);
 const W=columns*first.l+(columns-1)*kerf,H=rows*first.w+(rows-1)*kerf;
 function cell(i,j){
  const r={x:j*(first.l+kerf),y:i*(first.w+kerf),w:first.l,h:first.w},a=instances[i*columns+j];
  return a?{kind:'part',rect:r,part:{id:a.id,instance:a.instance,rotated:false}}:{kind:'waste',rect:r};
 }
 function chain(items,axis,rect){
  if(items.length===1)return items[0];
  const head=items[0],pos=axis==='V'?head.rect.x+head.rect.w:head.rect.y+head.rect.h;
  const rest=axis==='V'?{...rect,x:pos+kerf,w:rect.x+rect.w-pos-kerf}:{...rect,y:pos+kerf,h:rect.y+rect.h-pos-kerf};
  return {kind:'cut',rect,axis,pos,kerf,first:head,second:chain(items.slice(1),axis,rest)};
 }
 let tree;
 if(columnFirst){
  const cols=Array.from({length:columns},(_,j)=>chain(Array.from({length:rows},(_,i)=>cell(i,j)),'H',{x:j*(first.l+kerf),y:0,w:first.l,h:H}));
  tree=chain(cols,'V',{x:0,y:0,w:W,h:H});
 }else{
  const rr=Array.from({length:rows},(_,i)=>chain(Array.from({length:columns},(_,j)=>cell(i,j)),'V',{x:0,y:i*(first.w+kerf),w:W,h:first.w}));
  tree=chain(rr,'H',{x:0,y:0,w:W,h:H});
 }
 return {tree,w:W,h:H};
}
function groupedCandidate(p,jobs,rng,mode){
 const families=new Map();
 for(const a of jobs){const key=JSON.stringify([a.l,a.w,a.grain!==false]);if(!families.has(key))families.set(key,[]);families.get(key).push(a);}
 const blocks=[],templates=new Map(),actualOrder=[];
 for(const items of families.values()){
  let i=0;
  while(i<items.length){
   const max=Math.min(10,items.length-i),count=mode%5===0?max:1+Math.floor(rng()*max);
   let cols=1+Math.floor(rng()*count);
   const group=items.slice(i,i+count);i+=count;
   let grid=buildGrid(group,cols,p.kerf,rng()<0.25);
   if(grid.w>p.sheetW-2*p.trim||grid.h>p.sheetH-2*p.trim){cols=1;grid=buildGrid(group,cols,p.kerf,false);}
   // Oversized groups are dissolved; no required instance is dropped.
   if(grid.w>p.sheetW-2*p.trim||grid.h>p.sheetH-2*p.trim){
    for(const a of group){
     const id='block:'+blocks.length,one=buildGrid([a],1,p.kerf);
     blocks.push({id,instance:1,l:a.l,w:a.w,grain:true});templates.set(id,one.tree);actualOrder.push([a.id,a.instance]);
    }
   }else{
    const id='block:'+blocks.length;blocks.push({id,instance:1,l:grid.w,w:grid.h,grain:true});templates.set(id,grid.tree);
    actualOrder.push(...group.map(a=>[a.id,a.instance]));
   }
  }
 }
 blocks.sort((a,b)=>b.l*b.w-a.l*a.w);
 // Random insertion diversifies group placement while keeping each block intact.
 if(blocks.length>1&&mode%2){const a=Math.floor(rng()*blocks.length),b=Math.floor(rng()*blocks.length);blocks.splice(b,0,blocks.splice(a,1)[0]);}
 let widths=widthsFor(p,blocks,rng,mode,[]);
 const W=p.sheetW-2*p.trim,largest=Math.max(0,...blocks.map(a=>a.l));
 // A group-sized primary strip prevents a sampled narrow boundary from excluding all groups.
 if(mode%4!==0&&largest+p.kerf<W)widths=[largest,W-largest-p.kerf];
 const layout=candidate(p,blocks,widths,rng,mode,mode%2?'H':null);
 if(!layout)return null;
 function translated(n,x,y){
  const out={...n,rect:{...n.rect,x:n.rect.x+x,y:n.rect.y+y}};
  if(n.kind==='cut'){out.pos=n.pos+(n.axis==='V'?x:y);out.first=translated(n.first,x,y);out.second=translated(n.second,x,y);}
  else if(n.kind==='part')out.part={...n.part};
  return out;
 }
 function expand(n){
  if(n.kind==='part')return translated(templates.get(n.part.id),n.rect.x,n.rect.y);
  if(n.kind==='cut'){n.first=expand(n.first);n.second=expand(n.second);}return n;
 }
 let number=0;
 for(const sh of layout.sheets){
  sh.tree=expand(sh.tree);sh.parts=[];sh.remnants=[];
  function visit(n){if(n.kind==='cut'){n.number=++number;visit(n.first);visit(n.second);}
   else if(n.kind==='part')sh.parts.push({...n.rect,...n.part});
   else sh.remnants.push({...n.rect,area:n.rect.w*n.rect.h});}
  visit(sh.tree);
 }
 layout.partCount=jobs.length;layout.partOrder=actualOrder;layout.blockCount=blocks.length;
 return layout;
}
module.exports={groupedCandidate,buildGrid};

'use strict';
const {compileCompleted}=require('./completed-rip'),{fromTree}=require('./deferred-strip-patterns'),{estimateSheets}=require('./sheet-area-estimate');
const clone=value=>structuredClone(value),inside=(a,b)=>a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w&&a.y+a.h<=b.y+b.h;
function bindBook(p,book){
 const left=p.pieces.map(a=>a.q);
 function bind(n){
  if(!n.leaf)return{axis:n.axis,children:n.children.map(bind)};
  const w=n.rotated?n.w:n.l,h=n.rotated?n.l:n.w;
  const i=p.pieces.findIndex((a,i)=>left[i]>0&&(a.l===w&&a.w===h||a.grain===false&&a.l===h&&a.w===w));
  if(i<0)throw Error('Book is not an exact subset of the order');left[i]--;
  const a=p.pieces[i];return{part:{id:a.id,rotated:a.l!==w||a.w!==h},w,h};
 }
 return book.patterns.map(bind);
}
// Replace actual terminal waste, rebuild the complete tree and replay every cut.
// No rectangle is admitted merely because a part fits its bounding box.
function fillExisting(p,initialPatterns,{shouldStop=()=>false,maxAddedParts=64,maxAttempts=128}={}){
 const counts=new Map(p.pieces.map(a=>[a.id,0])),requested=new Map(p.pieces.map(a=>[a.id,a]));
 const count=n=>{if(n.part){if(!counts.has(n.part.id))throw Error('Unknown stored part');counts.set(n.part.id,counts.get(n.part.id)+1);}else n.children.forEach(count);};initialPatterns.forEach(count);
 const remaining=()=>p.pieces.map(a=>({...a,q:a.q-counts.get(a.id)})).filter(a=>a.q);
 for(const a of p.pieces)if(counts.get(a.id)>a.q)throw Error('Stored quantity exceeds order');
 if(remaining().reduce((n,a)=>n+a.q,0)>maxAddedParts)return null;
 const partial=()=>({...p,pieces:p.pieces.filter(a=>counts.get(a.id)>0).map(a=>({...a,q:counts.get(a.id)}))});
 let current=compileCompleted(partial(),clone(initialPatterns));
 const stats={placed:0,attempts:0,rejected:0,positionsPreserved:true};
 const useful={x:p.trim,y:p.trim,w:p.sheetW-2*p.trim,h:p.sheetH-2*p.trim};
 const cropped=r=>{const x=Math.max(r.x,useful.x),y=Math.max(r.y,useful.y);return{x,y,w:Math.max(0,Math.min(r.x+r.w,useful.x+useful.w)-x),h:Math.max(0,Math.min(r.y+r.h,useful.y+useful.h)-y)};};
 function graft(r,a,rotated,axes,instance,depth=0){
  const w=rotated?a.w:a.l,h=rotated?a.l:a.w;
  if(depth===2)return{kind:'part',rect:{...r},part:{id:a.id,instance,rotated}};
  const axis=axes[depth],v=axis==='V',span=v?r.w:r.h,size=v?w:h;
  if(span===size)return graft(r,a,rotated,axes,instance,depth+1);
  if(size<=0||size>span)throw Error('Invalid local size');
  const used=Math.min(p.kerf,span-size),pos=(v?r.x:r.y)+size;
  const first=v?{...r,w:size}:{...r,h:size},second=v?{...r,x:pos+used,w:span-size-used}:{...r,y:pos+used,h:span-size-used};
  return{kind:'cut',rect:{...r},axis,pos,kerf:p.kerf,first:graft(first,a,rotated,axes,instance,depth+1),second:{kind:'waste',rect:second}};
 }
 const pending=remaining().sort((a,b)=>b.l*b.w-a.l*a.w||a.id-b.id);
 for(const original of pending){
  const a=requested.get(original.id);
  while(counts.get(a.id)<a.q&&!shouldStop()&&stats.attempts<maxAttempts){
   let accepted=null;
   const free=[];
   current.sheets.forEach((sh,sheet)=>{function visit(n,path=[]){if(n.kind==='waste'){const rect=cropped(n.rect);if(rect.w>0&&rect.h>0)free.push({sheet,path,raw:n.rect,rect});}else if(n.kind==='cut'){visit(n.first,[...path,'first']);visit(n.second,[...path,'second']);}}visit(sh.tree);});
   free.sort((a,b)=>a.rect.w*a.rect.h-b.rect.w*b.rect.h);
   const instance=counts.get(a.id)+1;
   for(const slot of free){
    if(accepted||shouldStop()||stats.attempts>=maxAttempts)break;
    for(const rotated of a.grain===false&&a.l!==a.w?[false,true]:[false]){
     if(accepted||shouldStop()||stats.attempts>=maxAttempts)break;
     const w=rotated?a.w:a.l,h=rotated?a.l:a.w;if(w>slot.rect.w||h>slot.rect.h)continue;
     for(const axes of [['V','H'],['H','V']]){
      if(accepted||shouldStop()||stats.attempts>=maxAttempts)break;stats.attempts++;
      const sheets=clone(current.sheets),node=graft(slot.raw,a,rotated,axes,instance);let parent=sheets[slot.sheet];
      if(!slot.path.length)parent.tree=node;else{parent=parent.tree;for(const key of slot.path.slice(0,-1))parent=parent[key];parent[slot.path.at(-1)]=node;}
      counts.set(a.id,instance);
      try{
       const candidate=compileCompleted(partial(),sheets.map(sh=>fromTree(sh.tree,p.kerf)));
       const placed=candidate.sheets[slot.sheet].parts.find(b=>b.id===a.id&&b.instance===instance);
       if(!placed||!inside(placed,slot.rect))throw Error('Rebuilt part is outside the chosen free rectangle');
       // Fast recovery preserves every old placement. Deeper rearrangements are
       // left to the general search rather than being labelled waste filling.
       current.sheets.forEach((sh,i)=>sh.parts.forEach(old=>{const b=candidate.sheets[i].parts.find(b=>old.id===b.id&&old.instance===b.instance);if(!b||['x','y','w','h'].some(k=>old[k]!==b[k]))throw Error('Existing placement moved');}));
       accepted=candidate;
      }catch{stats.rejected++;}finally{counts.set(a.id,instance-1);}
     }
    }
   }
   if(!accepted)break;counts.set(a.id,instance);stats.placed++;current=accepted;
  }
 }
 const rest=remaining(),complete=rest.length===0;
 return{layout:current,patterns:current.sheets.map(sh=>fromTree(sh.tree,p.kerf)),remaining:rest,complete,stats};
}
function extendStoredBooks(p,books,{objective='remnants',shouldStop=()=>false,...options}={}){
 let best=null;const minimum=estimateSheets(p).minimumSheets;
 const score=r=>objective==='cuts'?[r.metrics.sheets,r.metrics.cuts,r.metrics.turns,-r.metrics.largestWaste]:[r.metrics.sheets,-r.metrics.largestWaste,r.metrics.cuts,r.metrics.turns];
 const better=(a,b)=>!b||a.some((v,i)=>v<b[i]&&a.slice(0,i).every((v,j)=>v===b[j]));
 for(const book of books.slice().sort((a,b)=>a.patterns.length-b.patterns.length)){
  if(shouldStop())break;
  try{
   const recovered=fillExisting(p,bindBook(p,book),{...options,shouldStop});if(!recovered?.complete)continue;
   const r=compileCompleted(p,recovered.patterns);r.experienceOrigin=true;r.learningMove='stored-waste-fill';r.recovery=recovered.stats;r.experienceInfo={used:true,recoveredParts:recovered.stats.placed};
   if(better(score(r),best&&score(best)))best=r;if(best.metrics.sheets===minimum)break;
  }catch{}
 }
 return best;
}
module.exports={bindBook,fillExisting,extendStoredBooks};

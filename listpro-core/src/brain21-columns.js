'use strict';
// Conservative feasibility fallback: exact-width primary columns; only
// longitudinal H cuts inside each column. At most one inherited rotation.
const {collect}=require('./pss-waste-local');
function columnFallback(p,jobs){
 const k=p.kerf,W=p.sheetW-2*p.trim,H=p.sheetH-2*p.trim,remaining=jobs.map(j=>{
  if(j.l<=W-2*k&&j.w<=H)return {j,w:j.l,h:j.w,rotated:false};
  if(j.grain===false&&j.w<=W-2*k&&j.l<=H)return {j,w:j.w,h:j.l,rotated:true};
  throw Error('Part outside supported detached-column reservation');
 });
 const waste=rect=>({kind:'waste',rect:{...rect}}),sheets=[];
 while(remaining.length){
  let capacity=W;const columns=[];
  while(true){
   const first=remaining.find(o=>o.w+k+k<=capacity);if(!first)break;
   const selected=[];let height=H;
   for(let i=0;i<remaining.length;){
    const o=remaining[i];if(o.w===first.w&&o.h<=height&&(o.h===height||height-o.h>=k)){
     selected.push(o);remaining.splice(i,1);height-=o.h+(height===o.h?0:k);
    }else i++;
   }
   columns.push({width:first.w,selected});capacity-=first.w+k;
  }
  if(!columns.length)throw Error('No column fits supported primary reservation');
  const primaryStrips=[];
  function column(items,i,r){
   if(i===items.length)return waste(r);const o=items[i];
   const part={kind:'part',rect:{...r,h:o.h},part:{id:o.j.id,instance:o.j.instance,rotated:o.rotated}};
   if(o.h===r.h)return part;
   return {kind:'cut',rect:{...r},axis:'H',pos:r.y+o.h,kerf:k,first:part,second:column(items,i+1,{...r,y:r.y+o.h+k,h:r.h-o.h-k})};
  }
  function compose(i,r,path){
   if(i===columns.length){primaryStrips.push({index:i+1,rect:{...r},path});return waste(r);}
   const c=columns[i],rect={...r,w:c.width};primaryStrips.push({index:i+1,rect,path:path+'/0'});
   return {kind:'cut',rect:{...r},axis:'V',pos:r.x+c.width,kerf:k,first:column(c.selected,0,rect),second:compose(i+1,{...r,x:r.x+c.width+k,w:r.w-c.width-k},path+'/1')};
  }
  sheets.push({tree:compose(0,{x:p.trim,y:p.trim,w:W,h:H},'r'),primaryStrips});
 }
 return collect({sheets,method:'brain21-exact-width-columns'});
}
module.exports={columnFallback};
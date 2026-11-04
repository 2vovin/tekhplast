'use strict';
const {estimateSheets}=require('./sheet-area-estimate'),{searchAdaptive}=require('./adaptive-held-strip'),{fromTree,buildRawLayout}=require('./deferred-strip-patterns'),{verifyDeferred}=require('./deferred-strip-search');
function searchDominantStrips(p,{iterations=100,seed=42,accept=()=>{}}={}){
 const W=p.sheetW-2*p.trim,H=p.sheetH-2*p.trim,k=p.kerf,lower=estimateSheets(p).minimumSheets,stats={families:0,attempts:0,accepted:0,rejected:0,axes:[]},layouts=[];
 const families=new Map();for(const a of p.pieces){const key=a.l+':'+a.w;const f=families.get(key)||{w:a.l,h:a.w,q:0};f.q+=a.q;families.set(key,f);}
 const choices=[...families.values()].map(f=>({...f,capacity:Math.floor((H+k)/(f.h+k))})).filter(f=>f.w>=W*.65&&f.w<W-k&&f.capacity>0&&Math.floor(f.q/f.capacity)>0&&Math.floor(f.q/f.capacity)<lower).sort((a,b)=>b.w*b.h*b.q-a.w*a.h*a.q);
 // This bounded family is a heuristic, never an infeasibility test.
 if(!choices.length||p.pieces.reduce((n,a)=>n+a.q,0)>200)return {layouts,stats};
 const f=choices[0],rem=JSON.parse(JSON.stringify(p)),prefix=[],groups=Math.floor(f.q/f.capacity);stats.families=1;
 for(let sh=0;sh<groups;sh++){
  const left=[];for(let j=0;j<f.capacity;j++){const a=rem.pieces.find(a=>a.l===f.w&&a.w===f.h&&a.q>0);a.q--;left.push({part:{id:a.id,rotated:false},w:a.l,h:a.w});}
  let dp=new Map([[0,{area:0,parts:[]}]]);
  for(const a of rem.pieces)for(let i=0;i<a.q;i++){
   const opts=[{w:a.l,h:a.w,rotated:false},...(a.grain===false&&a.l!==a.w?[{w:a.w,h:a.l,rotated:true}]:[])].filter(o=>o.w<=W-f.w-k);
   if(!opts.length)continue;const next=new Map(dp);
   for(const [used,c]of dp)for(const o of opts){const size=used+o.h+k;if(size>H+k)continue;const area=c.area+o.w*o.h;if(area>(next.get(size)?.area||0))next.set(size,{area,parts:[...c.parts,{part:{id:a.id,rotated:o.rotated},w:o.w,h:o.h}]});}
   dp=next.size>6000?new Map([...next].sort((a,b)=>b[1].area-a[1].area).slice(0,6000)):next;
  }
  const chosen=[...dp.values()].sort((a,b)=>b.area-a.area)[0];if(!chosen.parts.length)return {layouts,stats};
  chosen.parts.forEach(c=>rem.pieces.find(a=>a.id===c.part.id).q--);prefix.push({axis:'V',children:[{axis:'H',children:left},{axis:'H',children:chosen.parts}]});
 }
 rem.pieces=rem.pieces.filter(a=>a.q);
 for(const axis of ['H','V'])try{const t=searchAdaptive({...rem,sheetW:p.sheetW+k,sheetH:p.sheetH+k},{axis,seed,iterations,accept:s=>{stats.attempts++;try{const r=verifyDeferred(p,buildRawLayout(p,[...prefix,...s.sheets.map(sh=>fromTree(sh.tree,k))]));stats.accepted++;layouts.push(r);accept(r);return true;}catch{stats.rejected++;return false;}}});stats.axes.push(t.stats);}catch(e){stats.axes.push({axis,error:e.message});}
 return {layouts,stats};
}
module.exports={searchDominantStrips};

'use strict';
const {checkInput}=require('./core');
const {collect}=require('./pss-waste-local');
const {makeHeldPlan}=require('./held-strip-plan');
const {validateHeld}=require('./held-strip-validator');
function solveIdenticalTwoSheets(p,profile){
 checkInput(p);
 if(p.pieces.length!==1||!profile||profile.firstCutAxis!=='H')throw Error('This enumerator supports one detail type and H primary strips');
 const item=p.pieces[0],W=p.sheetW-2*p.trim,H=p.sheetH-2*p.trim,k=p.kerf;
 const kinds=[{w:item.l,h:item.w,rotated:false}];
 if(item.grain===false&&item.l!==item.w)kinds.push({w:item.w,h:item.l,rotated:true});
 const patterns=[];
 function enumerate(i,rows,used){
  if(i===kinds.length){if(rows.length)patterns.push(rows.slice().sort((a,b)=>b.h-a.h));if(patterns.length>1000)throw Error('Pattern budget exceeded');return;}
  const o=kinds[i];if(o.w+k>W)return enumerate(i+1,rows,used);
  const cap=Math.floor(W/(o.w+k)); // reserve a real cut at every column end
  const max=Math.floor((H-used)/(o.h+k));
  for(let n=0;n<=max;n++)enumerate(i+1,[...rows,...Array.from({length:n},()=>({...o,cap}))],used+n*(o.h+k));
 }
 enumerate(0,[],0);
 const waste=r=>({kind:'waste',rect:{...r}});
 function cut(r,axis,size,first,second){
  const v=axis==='V',pos=(v?r.x:r.y)+size;
  const a=v?{...r,w:size}:{...r,h:size},b=v?{...r,x:pos+k,w:r.w-size-k}:{...r,y:pos+k,h:r.h-size-k};
  return{kind:'cut',rect:{...r},axis,pos,kerf:k,first:first(a),second:second(b)};
 }
 function build(selected){
  let next=1;const sheets=[];
  for(const pattern of selected){
   if(next>item.q)break;
   const primaryStrips=[];
   function rows(r,index,path){
    if(next>item.q||index===pattern.length){primaryStrips.push({index:index+1,rect:{...r},path});return waste(r);}
    const o=pattern[index],count=Math.min(o.cap,item.q-next+1);
    primaryStrips.push({index:index+1,rect:{...r,h:o.h},path:path+'/0'});
    function columns(rr,j){
     if(j===count)return waste(rr);
     const instance=next++;
     return cut(rr,'V',o.w,a=>({kind:'part',rect:a,part:{id:item.id,instance,rotated:o.rotated}}),b=>columns(b,j+1));
    }
    return cut(r,'H',o.h,a=>columns(a,0),b=>rows(b,index+1,path+'/1'));
   }
   const tree=rows({x:p.trim,y:p.trim,w:W,h:H},0,'r');sheets.push({tree,primaryStrips,axis:'H'});
  }
  if(next<=item.q)return null;
  const s=collect({sheets,method:'identical-two-sheet-strip-pattern-enumeration',optimality:'restricted pattern family only'});
  s.parameters=p;s.equipmentProfile=profile;s.plan=makeHeldPlan(p,s,profile);
  s.verification=validateHeld(p,s,s.plan,profile);return s;
 }
 let remnantBest=null,cutsBest=null,checked=0;const seen=new Set();
 const better=(a,b,keys)=>!b||keys.some((fn,i)=>fn(a)<fn(b)&&keys.slice(0,i).every(f=>f(a)===f(b)));
 const m=s=>s.verification.metrics;
 const remnantScore=[s=>m(s).sheets,s=>-m(s).largestWaste,s=>m(s).cuts,s=>m(s).turns,s=>-s.sheets[0].parts.length];
 const cutScore=[s=>m(s).sheets,s=>m(s).cuts,s=>m(s).turns,s=>-m(s).largestWaste,s=>-s.sheets[0].parts.length];
 for(const a of patterns)for(const b of patterns){
  if([...a,...b].reduce((s,r)=>s+r.cap,0)<item.q)continue;
  const s=build([a,b]);if(!s)continue;
  const key=JSON.stringify(s.sheets.map(sh=>sh.parts));if(seen.has(key))continue;seen.add(key);checked++;
  if(better(s,remnantBest,remnantScore))remnantBest=s;
  if(better(s,cutsBest,cutScore))cutsBest=s;
 }
 if(!remnantBest)throw Error('No solution in two-sheet uniform-row family; not an infeasibility proof');
 return{remnantBest,cutsBest,stats:{patterns:patterns.length,verifiedCandidates:checked}};
}
module.exports={solveIdenticalTwoSheets};

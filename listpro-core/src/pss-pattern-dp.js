'use strict';
// Bounded count-vector slicing DP. Groups are SECONDARY patterns only, never anchors.
function patternDP(families,kerf,options={}){
 const maxW=options.maxW,maxH=options.maxH,maxArea=options.maxArea??maxW*maxH;
 const frontier=options.frontier??24,maxStates=options.maxStates??25000,maxItems=options.maxItems??26;
 const memo=new Map(),stats={states:0,partitions:0,combinations:0,pruned:0,frontierPruned:0,exhausted:false};
 const key=c=>c.join(',');
 function solve(counts){
  const id=key(counts);if(memo.has(id))return memo.get(id);
  const n=counts.reduce((a,b)=>a+b,0),area=counts.reduce((s,c,i)=>s+c*families[i].w*families[i].h,0);
  if(!n||n>maxItems||area>maxArea)return [];
  if(stats.states>=maxStates){stats.exhausted=true;return [];}
  stats.states++;const out=[];memo.set(id,out);
  function add(a){
   if(a.type!==undefined)a.cuts=0;
   else a.cuts=1+a.a.cuts+a.b.cuts+(a.axis==='V'?(a.a.h!==a.b.h?1:0):(a.a.w!==a.b.w?1:0));
   if(a.w>maxW||a.h>maxH||a.w*a.h>maxArea)return;
   if(out.some(b=>(!options.retainDominated||(a.w===b.w&&a.h===b.h))&&(b.w===a.w||a.w-b.w>=kerf)&&(b.h===a.h||a.h-b.h>=kerf)&&b.cuts<=a.cuts)){stats.pruned++;return;}
   for(let i=out.length-1;i>=0;i--)if((!options.retainDominated||(a.w===out[i].w&&a.h===out[i].h))&&(a.w===out[i].w||out[i].w-a.w>=kerf)&&(a.h===out[i].h||out[i].h-a.h>=kerf)&&a.cuts<=out[i].cuts)out.splice(i,1);
   out.push(a);
   if(options.retainDominated&&out.length>frontier*4){
    const ranked=out.slice().sort((a,b)=>a.w*a.h-b.w*b.h||a.cuts-b.cuts),wide=out.slice().sort((a,b)=>a.w-b.w||a.h-b.h),keep=new Set(ranked.slice(0,Math.ceil(frontier/2)));
    for(let i=0;i<Math.floor(frontier/2);i++)keep.add(wide[Math.round(i*(wide.length-1)/Math.max(1,Math.floor(frontier/2)-1))]);
    stats.frontierPruned+=out.length-keep.size;stats.pruned+=out.length-keep.size;out.splice(0,out.length,...keep);
   }
  }
  if(n===1){
   const i=counts.findIndex(x=>x);
   add({w:families[i].w,h:families[i].h,type:i});
   if(families[i].rotate)add({w:families[i].h,h:families[i].w,type:i,rotated:true});
   return out;
  }
  const a=counts.map(()=>0),b=counts.slice();
  // Enumerate each unordered partition once by mixed-radix rank.
  function enumerate(i,rankA,rankB,mul){
   if(stats.exhausted)return;
   if(i===counts.length){
    if(!rankA||!rankB||rankA>rankB)return;
    if(stats.partitions>=(options.maxPartitions??2000000)||stats.combinations>=(options.maxCombinations??20000000)){stats.exhausted=true;return;}stats.partitions++;
    const aa=solve(a),bb=solve(b);if(!aa.length||!bb.length)return;
    for(const x of aa)for(const y of bb){
     if(stats.combinations>=(options.maxCombinations??20000000)){stats.exhausted=true;return;}stats.combinations++;
     if(x.h===y.h||Math.abs(x.h-y.h)>=kerf)add({w:x.w+y.w+kerf,h:Math.max(x.h,y.h),axis:'V',a:x,b:y});
     if(x.w===y.w||Math.abs(x.w-y.w)>=kerf)add({w:Math.max(x.w,y.w),h:x.h+y.h+kerf,axis:'H',a:x,b:y});
    }
    return;
   }
   for(let q=0;q<=counts[i];q++){a[i]=q;b[i]=counts[i]-q;enumerate(i+1,rankA+q*mul,rankB+(counts[i]-q)*mul,mul*(counts[i]+1));}
  }
  enumerate(0,0,0,1);
  if(out.length>frontier){
   // Diverse aspect ratios plus compact patterns; bounded, not an exact certificate.
   const sorted=out.slice().sort((a,b)=>a.w-b.w||a.h-b.h),keep=new Set();
   for(let i=0;i<Math.floor(frontier/2);i++)keep.add(sorted[Math.round(i*(sorted.length-1)/Math.max(1,Math.floor(frontier/2)-1))]);
   for(const a of out.slice().sort((a,b)=>a.w*a.h-b.w*b.h))if(keep.size<frontier)keep.add(a);
   stats.frontierPruned+=out.length-keep.size;stats.pruned+=out.length-keep.size;out.splice(0,out.length,...keep);
  }
  return out;
 }
 return {solve,stats,memo};
}
module.exports={patternDP};

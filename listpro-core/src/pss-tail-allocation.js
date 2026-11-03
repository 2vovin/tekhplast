'use strict';
const {patternDP}=require('./pss-pattern-dp');
function familyJobs(jobs){
 const out=[];
 for(const j of jobs){let a=out.find(a=>a.w===j.l&&a.h===j.w&&a.rotate===(j.grain===false));if(!a)out.push(a={w:j.l,h:j.w,rotate:j.grain===false,jobs:[]});a.jobs.push(j);}
 return out;
}
function enumerateAnchors(p,families,axis,limit=4096){
 const cap=(axis==='H'?p.sheetH:p.sheetW)-2*p.trim,long=(axis==='H'?p.sheetW:p.sheetH)-2*p.trim,k=p.kerf;
 const totalArea=families.reduce((a,f)=>a+f.jobs.length*f.w*f.h,0),out=[],current=[],used=families.map(()=>0);
 let visited=0,exhausted=false;
 const orientations=families.flatMap((f,i)=>[{type:i,rotated:false,w:axis==='H'?f.h:f.w,h:axis==='H'?f.w:f.h},...(f.rotate?[{type:i,rotated:true,w:axis==='H'?f.w:f.h,h:axis==='H'?f.h:f.w}]:[])]);
 function visit(start,sum){
  if(visited>=limit){exhausted=true;return;}visited++;
  if(current.length&&sum*long>=totalArea){
   const tails=current.map(a=>({w:axis==='H'?long-a.h-k:a.w,h:axis==='H'?a.w:long-a.h-k}));
   const possible=families.every((f,i)=>used[i]===f.jobs.length||tails.some(r=>(r.w>=f.w&&r.h>=f.h)||(f.rotate&&r.w>=f.h&&r.h>=f.w)));
   if(possible)out.push({axis,anchors:current.map(a=>({...a})),used:used.slice(),sum,tailArea:tails.reduce((s,r)=>s+r.w*r.h,0)});
  }
  for(let i=start;i<orientations.length;i++){
   const a=orientations[i],next=sum+a.w+(current.length?k:0),left=cap-next;
   if(used[a.type]>=families[a.type].jobs.length||a.h>long||(long!==a.h&&long-a.h<k)||left<0||(left>0&&left<=k))continue;
   current.push(a);used[a.type]++;visit(i,next);used[a.type]--;current.pop();
  }
 }
 visit(0,0);
 out.sort((a,b)=>a.sum-b.sum||a.anchors.length-b.anchors.length||b.tailArea-a.tailArea);
 return {patterns:out,visited,exhausted};
}
function allocateTails(families,bins,counts,dp,options={}){
 const limit=options.maxStates??20000,random=options.random??(()=>0),memo=new Set();
 let nodes=0,subsets=0,vectors=0,exhausted=false;
 const area=c=>c.reduce((s,n,i)=>s+n*families[i].w*families[i].h,0),k=options.kerf;
 const fits=(r,s)=>s.w<=r.w&&s.h<=r.h&&(s.w===r.w||r.w-s.w>=k)&&(s.h===r.h||r.h-s.h>=k);
 // Narrow tails first. A fresh allocation changes positions, cuts and strip membership.
 const ordered=bins.map((r,i)=>({...r,index:i,rank:options.randomize?random():0})).sort((a,b)=>options.randomize?a.rank-b.rank:a.w*a.h-b.w*b.h);
 function solve(pos,left){
  if(!left.some(Boolean))return ordered.slice(pos).map(r=>({index:r.index,counts:left.map(()=>0),pattern:null}));
  if(pos===ordered.length)return null;
  const id=pos+':'+left.join(',');if(memo.has(id))return null;
  if(nodes>=limit){exhausted=true;return null;}nodes++;
  const r=ordered[pos],remainingArea=ordered.slice(pos+1).reduce((s,b)=>s+b.w*b.h,0),need=Math.max(0,area(left)-remainingArea);
  const options=[],c=left.map(()=>0);
  function add(){
   const ar=area(c);if(ar<need||ar>r.w*r.h)return;
   if(subsets>=(options.maxSubsets??30000)){exhausted=true;return;}subsets++;
   if(ar===0){options.push({counts:c.slice(),pattern:null,area:0,rank:random()});return;}
   const patterns=dp.solve(c).filter(s=>fits(r,s));
   if(patterns.length){
    patterns.sort((a,b)=>a.cuts-b.cuts||Math.max((r.w-a.w-k)*r.h,(r.h-a.h-k)*r.w)-Math.max((r.w-b.w-k)*r.h,(r.h-b.h-k)*r.w));
    const pattern=patterns[Math.floor(random()*Math.min(patterns.length,options.length?4:1))];
    options.push({counts:c.slice(),pattern,area:ar,rank:random()});
   }
  }
  function enumerate(i,ar){if(++vectors>(options.maxSubsets??30000)*32){exhausted=true;return;}if(ar>r.w*r.h||subsets>=(options.maxSubsets??30000)){if(subsets>=(options.maxSubsets??30000))exhausted=true;return;}if(i===left.length){add();return;}for(let n=0;n<=left[i];n++){c[i]=n;enumerate(i+1,ar+n*families[i].w*families[i].h);}}
  enumerate(0,0);
  options.sort((a,b)=>options.randomize?b.area*(0.6+0.8*b.rank)-a.area*(0.6+0.8*a.rank):b.area-a.area||a.rank-b.rank);
  for(const a of options){
   const next=left.map((n,i)=>n-a.counts[i]),tail=solve(pos+1,next);
   if(tail)return [{index:r.index,counts:a.counts,pattern:a.pattern},...tail];
  }
  memo.add(id);return null;
 }
 const result=solve(0,counts);
 return {allocation:result?.sort((a,b)=>a.index-b.index)??null,stats:{nodes,subsets,vectors,exhausted}};
}
module.exports={familyJobs,enumerateAnchors,allocateTails};

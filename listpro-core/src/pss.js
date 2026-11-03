'use strict';
const {checkInput}=require('./core');
const {validate}=require('./validator');
const {candidatePSS,rng}=require('./pss-candidates');
const {makePSSPlan}=require('./pss-plan');
const {validatePSS}=require('./pss-validator');
const {rebuildStrip}=require('./strip-dp');
const key=a=>JSON.stringify([a.id,a.instance]);
function anchorDP(jobs,axis,p,limit=4096){
 const cap=(axis==='H'?p.sheetH:p.sheetW)-2*p.trim,H=(axis==='H'?p.sheetW:p.sheetH)-2*p.trim,k=p.kerf;
 let states=new Map([[0,{jobs:[],area:0}]]),visited=0,pruned=0;
 for(const j of jobs){
  const w=axis==='H'?j.w:j.l,h=axis==='H'?j.l:j.w;
  if(w>cap||h>H||(h!==H&&H-h<k))continue;
  const prior=[...states];
  for(const [sum,s] of prior){
   const next=sum+w+k;if(next>cap+k)continue;visited++;
   const a=s.area+j.l*j.w,old=states.get(next);
   if(!old||a>old.area)states.set(next,{jobs:[...s.jobs,j],area:a});
  }
  if(states.size>limit){
   const ranked=[...states].sort((a,b)=>b[0]-a[0]||b[1].area-a[1].area);pruned+=ranked.length-limit;states=new Map(ranked.slice(0,limit));
  }
 }
 const patterns=[...states].filter(([sum,s])=>sum>0&&s.jobs.length).sort((a,b)=>b[0]-a[0]||b[1].area-a[1].area).slice(0,32).map(([,s])=>s.jobs);
 return {patterns,states:visited,pruned};
}
function searchPSS(p,options={}){
 const {jobs}=checkInput(p),profile=options.profile,iterations=options.iterations??100000,random=rng(options.seed??1);
 if(!profile||profile.mode!=='PANEL_SAW_STAGED')throw Error('PANEL_SAW_STAGED profile required');
 if(!Number.isSafeInteger(iterations)||iterations<1||!Number.isSafeInteger(options.refinements??24)||(options.refinements??24)<0||!Number.isSafeInteger(options.dpStates??1200)||(options.dpStates??1200)<1)throw Error('Invalid PSS budget');
 if(p.trim>0&&p.trim<p.kerf)throw Error('Trim below kerf unsupported by this profile');
 const axes=profile.allowedPrimaryAxes.filter(a=>profile.machineCutAxes.includes(a)||profile.maxSheetTurns>0);
 if(!axes.length)throw Error('No primary axis can be executed');
 const patterns=new Map(axes.map(a=>[a,anchorDP(jobs,a,p)])),lookup=new Map(jobs.map(j=>[key(j),j]));
 const distribution={},start=Date.now();
 let best=null,score=null,rejected=0,invalid=0,geometryStates=0,localStates=0,refinements=0,dpStates=0,oneSheetCandidates=0,lastError=null;
 const less=(a,b)=>!b||a.some((x,i)=>x<b[i]&&a.slice(0,i).every((y,j)=>y===b[j]));
 function consider(s){
  const g=validate(p,s);
  const prefix=[g.sheets,-g.largestWaste];
  if(score&&(prefix[0]>score[0]||(prefix[0]===score[0]&&prefix[1]>score[1])))return false;
  try{
   const plan=makePSSPlan(p,s,profile),verified=validatePSS(p,s,plan,profile),m=verified.metrics;
   const v=[g.sheets,-g.largestWaste,m.cuts,m.turns,m.cutLength,m.operations];
   if(less(v,score)){best=s;score=v;best.plan=plan;best.verification=verified;best.metrics={...g,...m};return true;}
  }catch(e){rejected++;lastError=e.message;}
  return false;
 }
 function refine(s){
  if(refinements>=(options.refinements??24))return;refinements++;
  // Only optimize the tail AFTER the immutable real leading anchor.
  for(let si=0;si<s.sheets.length;si++)for(const strip of s.sheets[si].primaryStrips){
   let root=s.sheets[si].tree;for(const bit of strip.path.split('/').slice(1))root=bit==='0'?root.first:root.second;
   if(root.kind!=='cut'||root.axis===(strip.axis??s.sheets[si].axis))continue;
   const tail=root.second,r=tail.rect,parts=s.sheets[si].parts.filter(a=>a.x>=r.x&&a.y>=r.y&&a.x+a.w<=r.x+r.w&&a.y+a.h<=r.y+r.h);
   const dpp={...profile,allowStripRotation:true,minimumHoldWidth:profile.minHoldWidth,minimumHoldHeight:profile.minHoldHeight};
   const result=rebuildStrip(r,parts,p.kerf,dpp,{maxStates:options.dpStates??1200,frontierSize:4,initialOrientation:s.sheets[si].axis==='H'?2:1});
   dpStates+=result.stats.states;
   for(const v of result.variants){
    const t=JSON.parse(JSON.stringify({sheets:s.sheets,partCount:s.partCount,partOrder:s.partOrder,mode:s.mode,version:s.version}));
    let node=t.sheets[si].tree;for(const bit of strip.path.split('/').slice(1))node=bit==='0'?node.first:node.second;
    node.second=JSON.parse(JSON.stringify(v.tree));let count=0;
    for(const sh of t.sheets){sh.parts=[];sh.remnants=[];
     function visit(n){if(n.kind==='cut'){n.number=++count;visit(n.first);visit(n.second);}else if(n.kind==='part')sh.parts.push({...n.rect,...n.part});else sh.remnants.push({...n.rect,area:n.rect.w*n.rect.h});}visit(sh.tree);
    }consider(t);
   }
  }
 }
 if(options.previous){validate(p,options.previous);consider(JSON.parse(JSON.stringify(options.previous)));}
 for(let i=0;i<iterations;i++){
  const axis=axes[i%axes.length];
  let order=jobs.map(j=>({j,rank:-(j.l*j.w)*(i===0?1:0.1+2*random())})).sort((a,b)=>a.rank-b.rank).map(a=>a.j);
  if(i%5===0){
   const families=new Map();
   for(const j of jobs){const k=JSON.stringify([j.l,j.w,j.grain!==false]);if(!families.has(k))families.set(k,[]);families.get(k).push(j);}
   order=[...families.values()].map(a=>({a,rank:-(a[0].l*a[0].w)*(0.2+random())})).sort((a,b)=>a.rank-b.rank).flatMap(a=>a.a);
  }
  if(i%4===1){
   const pp=patterns.get(axis).patterns;
   if(pp.length){const selected=pp[Math.floor(random()*pp.length)],selectedKeys=new Set(selected.map(key));order=[...selected.map(j=>({...j,forcePrimaryAnchor:true})),...order.filter(j=>!selectedKeys.has(key(j)))];}
  }
  if(best&&i%4===3){
   const inherited=best.partOrder?.map(a=>lookup.get(JSON.stringify(a)));
   if(inherited?.every(Boolean)&&inherited.length===jobs.length){
    localStates++;order=inherited;
    const a=Math.floor(random()*order.length),b=Math.floor(random()*order.length);
    if(order.length)order.splice(b,0,order.splice(a,1)[0]);
   }
  }
  const s=candidatePSS(p,order,axis,random,i);if(!s){invalid++;continue;}
  const g=validate(p,s);geometryStates++;distribution[g.sheets]=(distribution[g.sheets]??0)+1;if(g.sheets===1)oneSheetCandidates++;
  if(consider(s))refine(best);
 }
 if(!best)throw Error('No validated PSS solution: '+(lastError??'no physical anchor fits'));
 refine(best);
 best.method='PSS-1.2-real-anchor-dp-local';best.mode='PANEL_SAW_STAGED';best.optimality='not proven';
 best.parameters=JSON.parse(JSON.stringify(p));best.equipmentProfile=JSON.parse(JSON.stringify(profile));
 best.search={seed:options.seed??1,iterations,states:iterations,geometryStates,invalidCandidates:invalid,technologyRejected:rejected,lastError,
  distribution,oneSheetCandidates,localStates,anchorDPStates:[...patterns.values()].reduce((n,a)=>n+a.states,0),
  anchorDPPruned:[...patterns.values()].reduce((n,a)=>n+a.pruned,0),anchorPatterns:[...patterns].map(([axis,a])=>({axis,count:a.patterns.length})),
  refinements,tailDPStates:dpStates,elapsedMs:Date.now()-start};
 return best;
}
module.exports={searchPSS,anchorDP};

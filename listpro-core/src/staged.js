'use strict';
const {checkInput}=require('./core');
const {validate}=require('./validator');
const {random,candidate,widthsFor}=require('./strip-candidates');
function searchStaged(p,options={}){
 const {jobs}=checkInput(p),iterations=options.iterations??10000,rng=random(options.seed??1);
 if(!Number.isSafeInteger(iterations)||iterations<1)throw Error('Invalid staged budget');
 const {makeStagedPlan}=require('./staged-plan');
 const {validateStaged}=require('./staged-validator');
 const profile=options.profile;
 if(!profile)throw Error('Explicit staged equipment profile required');
 let best=null,score=null,rejected=0,failures=0,lastError=null,geometryCandidates=0,boundPruned=0;
 const distribution={},start=Date.now();
 // Bounded subset-sum DP proposes mixed block widths, with actual instance multiplicities.
 // It generates candidates; it does not prove optimality of nesting or of the strip plan.
 const cap=p.sheetW-2*p.trim,dp=Array.from({length:4},()=>new Set());
 dp[0].add(0);
 for(const job of jobs)for(let count=3;count>=1;count--)for(const sum of dp[count-1]){
  const next=sum+job.l+(count>1?p.kerf:0);if(next<cap)dp[count].add(next);
 }
 const groupWidths=[...new Set([...dp[2],...dp[3]])];
 const byInstance=new Map(jobs.map(j=>[JSON.stringify([j.id,j.instance]),j]));
 let localStates=0;
 const better=v=>!score||v.some((x,i)=>x<score[i]&&v.slice(0,i).every((y,j)=>y===score[j]));
 function consider(s){
  const geometry=validate(p,s);geometryCandidates++;distribution[geometry.sheets]=(distribution[geometry.sheets]??0)+1;
  const preliminary=[geometry.sheets,-geometry.largestWaste];
  if(score&&(preliminary[0]>score[0]||(preliminary[0]===score[0]&&preliminary[1]>score[1]))){boundPruned++;return;}
  try{
   const plan=makeStagedPlan(p,s,profile),checked=validateStaged(p,s,plan,profile);
   const m=checked.metrics,v=[geometry.sheets,-geometry.largestWaste,m.stages,m.turns,m.cuts,m.cutLength];
   if(better(v)){best=s;score=v;best.plan=plan;best.verification=checked;best.metrics={...geometry,...m};}
  }catch(e){rejected++;lastError=e.message;}
 }
 if(options.previous)consider(JSON.parse(JSON.stringify(options.previous)));
 for(let i=0;i<iterations;i++){
  let widths=widthsFor(p,jobs,rng,i,groupWidths);
  let order=jobs.map(j=>({j,key:-(j.l*j.w)*(i===0?1:0.15+rng()*1.7)})).sort((a,b)=>a.key-b.key).map(a=>a.j);
  if(best&&i%4===3&&best.partOrder?.length===jobs.length){
   const inherited=best.partOrder.map(key=>byInstance.get(JSON.stringify(key)));
   if(inherited.every(Boolean)&&new Set(inherited).size===jobs.length){
    localStates++;order=inherited;
    if(order.length>1){const a=Math.floor(rng()*order.length),b=Math.floor(rng()*order.length);[order[a],order[b]]=[order[b],order[a]];}
    widths=best.sheets[0].primaryStrips.map(s=>s.rect.w);
    if(widths.length>1&&rng()<0.5){
     const a=Math.floor(rng()*(widths.length-1)),delta=(rng()<0.5?-1:1)*(1+Math.floor(rng()*50));
     if(widths[a]+delta>0&&widths[a+1]-delta>0){widths[a]+=delta;widths[a+1]-=delta;}
    }
   }
  }
  const s=candidate(p,order,widths,rng,i);
  if(s)consider(s);else failures++;
 }
 if(!best)throw Error('No validated staged solution found: '+(lastError??'primary strip widths cannot accommodate a part'));
 best.parameters=JSON.parse(JSON.stringify(p));best.equipmentProfile=JSON.parse(JSON.stringify(profile));
 best.search={seed:options.seed??1,iterations,states:iterations,pruned:boundPruned+failures,boundPruned,geometryCandidates,localStates,dpGroupWidths:groupWidths.length,failedWidthAssignments:failures,technologyRejected:rejected,lastError,distribution,elapsedMs:Date.now()-start};
 return best;
}
module.exports={searchStaged};

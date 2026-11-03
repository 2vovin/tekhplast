'use strict';
// Fixed-placement guillotine DP. Material coordinates never change.
// Every proposed tree is subsequently replayed by the independent machine validator.
function rebuildStrip(rect,parts,kerf,profile,options={}){
 const limit=options.maxStates??8000,keep=options.frontierSize??6;
 if(!Number.isSafeInteger(limit)||limit<1||!Number.isSafeInteger(keep)||keep<1)throw Error('Invalid DP budget');
 const memo=new Map();let states=0,transitions=0,pruned=0,exhausted=false;
 const dimsEqual=(a,b)=>['x','y','w','h'].every(k=>a[k]===b[k]);
 const dominates=(a,b)=>a.largestWaste>=b.largestWaste&&a.cuts<=b.cuts&&a.turns<=b.turns&&a.length<=b.length;
 function frontier(items){
  items.sort((a,b)=>b.largestWaste-a.largestWaste||a.cuts-b.cuts||a.turns-b.turns||a.length-b.length);
  const out=[];
  for(const a of items){
   if(out.some(b=>dominates(b,a))){pruned++;continue;}
   for(let i=out.length-1;i>=0;i--)if(dominates(a,out[i]))out.splice(i,1);
   out.push(a);
  }
  // Bounded frontier: research heuristic, not an exact optimality claim.
  if(out.length>keep)pruned+=out.length-keep;
  return out.slice(0,keep);
 }
 function solve(r,ids,q){
  if(!ids.length)return [{tree:{kind:'waste',rect:{...r}},largestWaste:r.w*r.h,cuts:0,turns:0,length:0}];
  if(ids.length===1&&dimsEqual(r,parts[ids[0]])){
   const a=parts[ids[0]];
   return [{tree:{kind:'part',rect:{...r},part:{id:a.id,instance:a.instance,rotated:a.rotated}},largestWaste:0,cuts:0,turns:0,length:0}];
  }
  const key=[r.x,r.y,r.w,r.h,q,ids.join(',')].join(':');
  if(memo.has(key))return memo.get(key);
  if(states>=limit){exhausted=true;return [];}
  states++;const proposals=[];
  for(const axis of ['H','V']){
   const vertical=axis==='V',start=vertical?r.x:r.y,span=vertical?r.w:r.h;
   const positions=new Set();
   for(const i of ids){const a=parts[i];positions.add(vertical?a.x+a.w:a.y+a.h);positions.add((vertical?a.x:a.y)-kerf);}
   let nextQ=q,turn=0,machineAxis=q%2?(vertical?'H':'V'):axis;
   if(!profile.machineCutAxes.includes(machineAxis)){nextQ=(q+1)%4;turn=1;machineAxis=nextQ%2?(vertical?'H':'V'):axis;}
   if(!profile.machineCutAxes.includes(machineAxis)||(turn&&!profile.allowStripRotation))continue;
   const dW=q%2?r.h:r.w,dH=q%2?r.w:r.h;
   if(dW<profile.minimumHoldWidth||dH<profile.minimumHoldHeight)continue;
   for(const pos of positions){
    if(pos<=start||pos+kerf>start+span)continue;
    const left=[],right=[];let valid=true;
    for(const i of ids){
     const a=parts[i],lo=vertical?a.x:a.y,hi=lo+(vertical?a.w:a.h);
     if(hi<=pos)left.push(i);else if(lo>=pos+kerf)right.push(i);else{valid=false;break;}
    }
    if(!valid)continue;transitions++;
    const d=pos-start,ra=vertical?{...r,w:d}:{...r,h:d};
    const rb=vertical?{...r,x:pos+kerf,w:span-d-kerf}:{...r,y:pos+kerf,h:span-d-kerf};
    const A=solve(ra,left,nextQ),B=solve(rb,right,nextQ);
    for(const a of A)for(const b of B)proposals.push({
     tree:{kind:'cut',rect:{...r},axis,pos,kerf,first:a.tree,second:b.tree},
     largestWaste:Math.max(a.largestWaste,b.largestWaste),cuts:1+a.cuts+b.cuts,
     turns:turn+a.turns+b.turns,length:(vertical?r.h:r.w)+a.length+b.length
    });
   }
  }
  const result=frontier(proposals);memo.set(key,result);return result;
 }
 // Following strip cross-trimming, orientation is normally 90 degrees (machine V only).
 const q=options.initialOrientation??(profile.machineCutAxes.includes('H')?0:1);
 const variants=solve(rect,parts.map((_,i)=>i),q);
 return {variants,stats:{states,transitions,pruned,exhausted,limit,frontierSize:keep}};
}
function rebuildLayout(p,layout,profile,options={}){
 const clone=a=>JSON.parse(JSON.stringify(a));
 // Drop stale plans/traces before branching: only geometry is copied and revalidated later.
 const geometryOnly={sheets:layout.sheets,partCount:layout.partCount,partOrder:layout.partOrder,
  method:layout.method,optimality:layout.optimality,...(layout.blockCount===undefined?{}:{blockCount:layout.blockCount})};
 let variants=[clone(geometryOnly)],states=0,transitions=0,pruned=0,exhausted=false;
 function nodeAt(sh,path){let n=sh.tree;for(const v of path.split('/').slice(1))n=v==='0'?n.first:n.second;return n;}
 function replace(sh,path,node){
  const pathParts=path.split('/').slice(1);
  if(!pathParts.length){sh.tree=node;return;}
  const side=pathParts.pop();let parent=sh.tree;
  for(const v of pathParts)parent=v==='0'?parent.first:parent.second;
  parent[side==='0'?'first':'second']=node;
 }
 function rank(s){
  let largest=0,cuts=0,turns=0;
  function walk(n,q){if(n.kind==='cut'){cuts++;let axis=q%2?(n.axis==='V'?'H':'V'):n.axis;if(!profile.machineCutAxes.includes(axis)){q=(q+1)%4;turns++;}walk(n.first,q);walk(n.second,q);}else if(n.kind==='waste')largest=Math.max(largest,n.rect.w*n.rect.h);}
  s.sheets.forEach(sh=>sh.primaryStrips.forEach(a=>walk(nodeAt(sh,a.path),p.trim>0&&!profile.machineCutAxes.includes('H')?1:0)));
  return [-largest,cuts,turns];
 }
 const compare=(a,b)=>{const x=rank(a),y=rank(b);return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];};
 for(let si=0;si<layout.sheets.length;si++)for(const strip of layout.sheets[si].primaryStrips){
  const r=strip.rect,parts=layout.sheets[si].parts.filter(a=>a.x>=r.x&&a.y>=r.y&&a.x+a.w<=r.x+r.w&&a.y+a.h<=r.y+r.h);
  const remaining=(options.maxStates??16000)-states;
  if(remaining<=0){exhausted=true;continue;}
  const result=rebuildStrip(r,parts,p.kerf,profile,{...options,maxStates:remaining,initialOrientation:options.initialOrientation??(p.trim>0&&!profile.machineCutAxes.includes('H')?1:0)});
  states+=result.stats.states;transitions+=result.stats.transitions;pruned+=result.stats.pruned;exhausted||=result.stats.exhausted;
  const next=[];
  for(const s of variants){
   next.push(s);
   for(const item of result.variants){const changed=clone(s);replace(changed.sheets[si],strip.path,clone(item.tree));next.push(changed);}
  }
  next.sort(compare);variants=next.slice(0,options.beamSize??8);
 }
 for(const s of variants){
  let number=0;
  for(const sh of s.sheets){
   sh.parts=[];sh.remnants=[];
   function visit(n){if(n.kind==='cut'){n.number=++number;visit(n.first);visit(n.second);}
    else if(n.kind==='part')sh.parts.push({...n.rect,...n.part});
    else sh.remnants.push({...n.rect,area:n.rect.w*n.rect.h});}
   visit(sh.tree);
  }
  delete s.plan;delete s.verification;delete s.metrics;
 }
 return {variants,stats:{states,transitions,pruned,exhausted,limit:options.maxStates??16000}};
}
module.exports={rebuildStrip,rebuildLayout};

'use strict';
const {patternDP}=require('./pss-pattern-dp');
const {familyJobs}=require('./pss-tail-allocation');
const key=a=>JSON.stringify([a.id,a.instance]);
const inside=(a,b)=>a.x>=b.x&&a.y>=b.y&&a.x+a.w<=b.x+b.w&&a.y+a.h<=b.y+b.h;
function at(tree,path){let n=tree;for(const b of path.split('/').slice(1))n=b==='0'?n.first:n.second;return n;}
function replace(sh,path,node){const bits=path.split('/').slice(1);if(!bits.length){sh.tree=node;return;}const side=bits.pop();let n=sh.tree;for(const b of bits)n=b==='0'?n.first:n.second;n[side==='0'?'first':'second']=node;}
function collect(layout){
 let number=0;
 for(const sh of layout.sheets){sh.parts=[];sh.remnants=[];
  function walk(n){if(n.kind==='cut'){n.number=++number;walk(n.first);walk(n.second);}else if(n.kind==='part')sh.parts.push({...n.rect,...n.part});else sh.remnants.push({...n.rect,area:n.rect.w*n.rect.h});}walk(sh.tree);
 }
 layout.partCount=layout.sheets.reduce((n,s)=>n+s.parts.length,0);
 return layout;
}
function wasteInventory(layout,verification){
 const out=[];
 layout.sheets.forEach((sh,sheet)=>{
  function walk(n,path){
   if(n.kind==='cut'){walk(n.first,path+'/0');walk(n.second,path+'/1');return;}
   if(n.kind!=='waste'||n.rect.w<=0||n.rect.h<=0)return;
   const strip=sh.primaryStrips.find(a=>path===a.path||path.startsWith(a.path+'/'));
   const physical=verification.blanks.find(b=>b.sheet===sheet&&b.role==='SECONDARY_BLANK'&&
    ['x','y','w','h'].every(k=>b.materialRect[k]===n.rect[k])&&
    !verification.blanks.some(c=>c.parentBlankId===b.blankId));
   out.push({sheet,path,rect:{...n.rect},strip:strip?.index??null,blankId:physical?.blankId??null,
    machineOrientation:physical?.machineOrientation??null,turnCount:physical?.turnCount??null,
    eligible:!!strip&&!!physical,reason:!strip?'PRIMARY_REMAINDER: not a detached working strip':!physical?'No matching live secondary blank':'Detached strip terminal waste'});
  }
  walk(sh.tree,'r');
 });
 return out;
}
function expandPattern(pattern,rect,families,kerf,paddingOrder='V'){
 const queues=families.map(f=>f.jobs.slice());
 const waste=r=>({kind:'waste',rect:{...r}});
 function cut(r,axis,pos,a,b){return {kind:'cut',rect:{...r},axis,pos,kerf,first:a,second:b};}
 function embed(a,r){
  if(!a)return waste(r);
  if(a.w>r.w||a.h>r.h||(a.w!==r.w&&r.w-a.w<kerf)||(a.h!==r.h&&r.h-a.h<kerf))throw Error('Local pattern/kerf does not fit');
  const axes=paddingOrder==='V'?['V','H']:['H','V'];
  function pad(i,r){
   if(i===2){
    if(a.type!==undefined){
     const j=queues[a.type].shift();if(!j)throw Error('Local pattern duplicate instance');
     return {kind:'part',rect:{...r},part:{id:j.id,instance:j.instance,rotated:!!a.rotated}};
    }
    const v=a.axis==='V',pos=(v?r.x:r.y)+(v?a.a.w:a.a.h),
     ra=v?{...r,w:a.a.w}:{...r,h:a.a.h},rb=v?{...r,x:pos+kerf,w:r.w-a.a.w-kerf}:{...r,y:pos+kerf,h:r.h-a.a.h-kerf};
    return cut(r,a.axis,pos,embed(a.a,ra),embed(a.b,rb));
   }
   const axis=axes[i],v=axis==='V',size=v?a.w:a.h,span=v?r.w:r.h;
   if(size===span)return pad(i+1,r);
   const pos=(v?r.x:r.y)+size,ra=v?{...r,w:size}:{...r,h:size},rb=v?{...r,x:pos+kerf,w:span-size-kerf}:{...r,y:pos+kerf,h:span-size-kerf};
   return cut(r,axis,pos,pad(i+1,ra),waste(rb));
  }
  return pad(0,r);
 }
 const tree=embed(pattern,rect);
 if(queues.some(q=>q.length))throw Error('Local pattern omitted instance');
 return tree;
}
function localPatterns(rect,mandatory,optional,kerf,options={}){
 const families=familyJobs([...mandatory,...optional]),must=new Set(mandatory.map(key));
 const min=families.map(f=>f.jobs.filter(j=>must.has(key(j))).length),
  max=families.map(f=>f.jobs.length),counts=min.slice();
 // Family instance queues put mandatory originals first, then actual incoming IDs.
 families.forEach(f=>f.jobs.sort((a,b)=>Number(must.has(key(b)))-Number(must.has(key(a)))));
 const dp=patternDP(families,kerf,{maxW:rect.w,maxH:rect.h,maxArea:rect.w*rect.h,maxStates:options.dpStates??3000,
  maxCombinations:options.combinations??500000,maxPartitions:options.partitions??100000,frontier:options.frontier??32,
  maxItems:mandatory.length+optional.length,retainDominated:options.retainDominated??true});
 let vectors=0,visited=0;const candidates=[],limit=options.subsets??2000;
 function enumerate(i,area){
  if(++visited>limit*32||vectors>=limit||area>rect.w*rect.h)return;
  if(i===families.length){
   vectors++;const added=counts.reduce((s,c,j)=>s+c-min[j],0);if(!added)return;
   const selected=families.map((f,j)=>({...f,jobs:f.jobs.slice(0,counts[j])}));
   for(const pat of dp.solve(counts)){
    if(pat.w>rect.w||pat.h>rect.h||(pat.w!==rect.w&&rect.w-pat.w<kerf)||(pat.h!==rect.h&&rect.h-pat.h<kerf))continue;
    const moved=selected.flatMap(f=>f.jobs.filter(j=>!must.has(key(j))));
    candidates.push({pattern:pat,families:selected,moved,added,area:moved.reduce((s,j)=>s+j.l*j.w,0),cuts:pat.cuts});
   }return;
  }
  for(let n=max[i];n>=min[i];n--){counts[i]=n;enumerate(i+1,area+n*families[i].w*families[i].h);}
 }
 enumerate(0,0);
 candidates.sort((a,b)=>b.area-a.area||b.added-a.added||a.cuts-b.cuts||a.pattern.w*a.pattern.h-b.pattern.w*b.pattern.h);
 return {candidates:candidates.slice(0,options.candidates??32),stats:{vectors,visited,subsetExhausted:vectors>=limit||visited>limit*32,dp:dp.stats}};
}
module.exports={key,inside,at,replace,collect,wasteInventory,expandPattern,localPatterns};

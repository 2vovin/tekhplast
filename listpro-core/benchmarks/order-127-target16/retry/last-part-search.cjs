const fs=require('fs'),B=require('path').resolve(__dirname,'../../..')+'/',current=JSON.parse(fs.readFileSync(process.argv[2])),p=current.parameters,{compileCompleted}=require(B+'src/completed-rip'),{fromTree}=require(B+'src/deferred-strip-patterns'),{searchCompleted}=require(B+'src/completed-rip-search'),{runPacking}=require(B+'src/packing-pss');
const areas=current.sheets.map(s=>s.parts.reduce((v,a)=>v+a.w*a.h,0)),last=areas.indexOf(Math.min(...areas)),pool=areas.map((a,i)=>i).filter(i=>i!==last),groups=[];let stop=false;const start=Date.now();
for(let i=0;i<pool.length;i++)for(let j=i+1;j<pool.length;j++){groups.push([last,pool[i],pool[j]]);for(let k=j+1;k<pool.length;k++)groups.push([last,pool[i],pool[j],pool[k]]);}
const ranked=groups.map(ids=>({ids,fill:ids.reduce((s,i)=>s+areas[i],0)/((ids.length-1)*((p.sheetW-2*p.trim)*(p.sheetH-2*p.trim)))})).filter(g=>g.fill<.98).sort((a,b)=>a.fill-b.fill);
function merge(s,ids){const r=compileCompleted(p,[...current.sheets.filter((_,i)=>!ids.includes(i)),...s.sheets].map(s=>fromTree(s.tree,p.kerf)));if(r.metrics.sheets<=16){fs.writeFileSync(process.argv[3],JSON.stringify(r));stop=true;console.log('FOUND',JSON.stringify(r.metrics));}return r;}
for(let i=0;i<Math.min(24,ranked.length)&&!stop&&Date.now()-start<120000;i++){
 const {ids,fill}=ranked[i],counts=new Map();for(const si of ids)for(const a of current.sheets[si].parts)counts.set(a.id,(counts.get(a.id)||0)+1);const sub={...p,pieces:p.pieces.filter(a=>counts.has(a.id)).map(a=>({...a,q:counts.get(a.id)}))};let best=ids.length;
 try{searchCompleted(sub,{iterations:40,seed:91+i,onBest:r=>{best=Math.min(best,r.metrics.sheets);if(r.metrics.sheets<ids.length)merge(r,ids);},shouldStop:()=>stop||Date.now()-start>120000});}catch(e){console.log('JS',e.message);}
 for(const axis of ['V','H']){if(stop||Date.now()-start>120000)break;try{const {result:r}=runPacking(sub,{python:process.argv[4]||'python3',axis,stages:2,seconds:3});best=Math.min(best,r.metrics.sheets);if(r.metrics.sheets<ids.length)merge(r,ids);}catch(e){console.log('native',e.message);}}
 console.log(JSON.stringify({i,ids,fill,best,ms:Date.now()-start}));
}

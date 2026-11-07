// Offline research, no production service changes. Output directory: argv[2].
const out=require('path').resolve(process.argv[2]||'/tmp/listpro-retry');require('fs').mkdirSync(out,{recursive:true});
const fs=require('fs'),base=require('path').resolve(__dirname,'../../..')+'/',p=require(base+'benchmarks/order-127-target16/input.json'),{fromTree}=require(base+'src/deferred-strip-patterns'),{compileCompleted}=require(base+'src/completed-rip'),{searchCompleted}=require(base+'src/completed-rip-search');
let current=require(base+'benchmarks/order-127-target16/result.json'),stop=false,rand=81107;const rng=()=>((rand=(Math.imul(rand,1664525)+1013904223)>>>0)/4294967296);const start=Date.now();
const energy=r=>r.sheets.map(s=>s.parts.reduce((v,a)=>v+a.w*a.h,0)).reduce((s,a)=>s+a*a,0);
function merge(s,chosen){const patterns=[...current.sheets.filter((s,i)=>!chosen.includes(i)),...s.sheets].map(sh=>fromTree(sh.tree,p.kerf));const clear=n=>{if(n.part)delete n.part.instance;else n.children.forEach(clear);};patterns.forEach(clear);return compileCompleted(p,patterns);}
for(let round=0;round<100&&!stop&&Date.now()-start<200000;round++){
 const ranked=current.sheets.map((s,i)=>({i,a:s.parts.reduce((v,a)=>v+a.w*a.h,0)})).sort((a,b)=>a.a-b.a),n=[5,7,9,11][round%4],chosen=ranked.slice(0,1+round%2).map(a=>a.i),pool=ranked.filter(a=>!chosen.includes(a.i)).map(a=>a.i);
 while(chosen.length<n)chosen.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);
 const counts=new Map();for(const i of chosen)for(const a of current.sheets[i].parts)counts.set(a.id,(counts.get(a.id)||0)+1);const sub={...p,pieces:p.pieces.filter(a=>counts.has(a.id)).map(a=>({...a,q:counts.get(a.id)}))};
 let contender=null;try{searchCompleted(sub,{iterations:25,seed:1000+round,shouldStop:()=>stop||Date.now()-start>200000,onBest:s=>{if(s.metrics.sheets>n)return;let r;try{r=merge(s,chosen);}catch{return;}if(!contender||r.metrics.sheets<contender.metrics.sheets||r.metrics.sheets===contender.metrics.sheets&&energy(r)>energy(contender))contender=r;if(r.metrics.sheets<=16){stop=true;fs.writeFileSync(out+'/retry-target16-found.json',JSON.stringify(r));console.log('FOUND',JSON.stringify(r.metrics));}}});}catch(e){console.log('reject',e.message);}
 if(contender&&(energy(contender)>energy(current)||round%9===8)){current=contender;fs.writeFileSync(out+'/retry-target16-incumbent.json',JSON.stringify(current));}
 console.log(JSON.stringify({round,n,sheets:current.metrics.sheets,energy:energy(current),ms:Date.now()-start}));
}

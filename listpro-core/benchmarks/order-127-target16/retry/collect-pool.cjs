// Offline research, no production service changes. Output directory: argv[2].
const out=require('path').resolve(process.argv[2]||'/tmp/listpro-retry');require('fs').mkdirSync(out,{recursive:true});
const fs=require('fs'),base=require('path').resolve(__dirname,'../../..')+'/',p=require(base+'benchmarks/order-127-target16/input.json'),{fromTree}=require(base+'src/deferred-strip-patterns'),{compileCompleted}=require(base+'src/completed-rip'),{searchCompleted}=require(base+'src/completed-rip-search');
const groups=[],byDim=new Map();for(const a of p.pieces){const key=[a.l,a.w].sort((a,b)=>b-a).join('x');let g=byDim.get(key);if(!g){g={index:groups.length,key,q:0,l:Math.max(a.l,a.w),w:Math.min(a.l,a.w)};groups.push(g);byDim.set(key,g);}g.q+=a.q;}
const bank=new Map();let stop=false;function add(r){for(const sh of r.sheets){const pattern=fromTree(sh.tree,5),counts=groups.map(()=>0);function bind(n){if(n.part){const g=byDim.get([n.w,n.h].sort((a,b)=>b-a).join('x'));counts[g.index]++;n.part={id:g.index+1,rotated:n.w!==g.l};}else n.children.forEach(bind);}bind(pattern);const key=counts.join(',');if(bank.has(key))continue;const sub={...p,pieces:groups.filter(g=>counts[g.index]).map(g=>({id:g.index+1,l:g.l,w:g.w,q:counts[g.index],grain:false}))};try{compileCompleted(sub,[pattern]);bank.set(key,{counts,pattern});}catch{}}}
add(require(base+'benchmarks/order-127-target16/result.json'));
for(const f of process.argv.slice(3))if(fs.existsSync(f))add(JSON.parse(fs.readFileSync(f)));
const start=Date.now();for(let i=0;i<80&&Date.now()-start<120000;i++){
 const pp=i%2?p:{...p,pieces:groups.map(g=>({id:g.index+1,l:g.l,w:g.w,q:g.q,grain:false}))};
 try{searchCompleted(pp,{iterations:8,seed:30000+i,onBest:r=>{add(r);if(r.metrics.sheets<=16){fs.writeFileSync(out+'/retry-pool-found-raw.json',JSON.stringify(r));stop=true;}},shouldStop:()=>stop});}catch{}
 console.log(JSON.stringify({i,patterns:bank.size,ms:Date.now()-start}));fs.writeFileSync(out+'/retry-pattern-pool.json',JSON.stringify({parameters:p,groups,patterns:[...bank.values()]}));if(stop)break;
}

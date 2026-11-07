const fs=require('fs'),B=require('path').resolve(__dirname,'../../..')+'/',{compileCompleted}=require(B+'src/completed-rip'),{fromTree}=require(B+'src/deferred-strip-patterns'),{searchCompleted}=require(B+'src/completed-rip-search'),pool=JSON.parse(fs.readFileSync(process.argv[2])),sel=JSON.parse(fs.readFileSync(process.argv[3])),p=pool.parameters;
const queues=p.pieces.map(a=>({...a,left:a.q})),patterns=sel.selection.flatMap(s=>Array.from({length:s.copies},()=>structuredClone(pool.patterns[s.index].pattern)));
function bind(n){if(n.part){const a=queues.find(a=>a.left&&((a.l===n.w&&a.w===n.h)||(a.grain===false&&a.w===n.w&&a.l===n.h)));if(!a)throw Error('Excess');a.left--;n.part={id:a.id,rotated:a.l!==n.w||a.w!==n.h};}else n.children.forEach(bind);}patterns.forEach(bind);
const params=()=>({...p,pieces:queues.filter(a=>a.q>a.left).map(({left,...a})=>({...a,q:a.q-left}))});let current=compileCompleted(params(),patterns),probes=0;
function make(r,a,rot,axes,index=0){const w=rot?a.w:a.l,h=rot?a.l:a.w;if(index===2)return{kind:'part',rect:r,part:{id:a.id,rotated:rot}};const axis=axes[index],span=axis==='V'?r.w:r.h,size=axis==='V'?w:h;if(span===size)return make(r,a,rot,axes,index+1);if(span<size+p.kerf)throw Error('kerf');const pos=(axis==='V'?r.x:r.y)+size,ra=axis==='V'?{...r,w:size}:{...r,h:size},rb=axis==='V'?{...r,x:pos+p.kerf,w:r.w-size-p.kerf}:{...r,y:pos+p.kerf,h:r.h-size-p.kerf};return{kind:'cut',rect:r,axis,pos,kerf:p.kerf,first:make(ra,a,rot,axes,index+1),second:{kind:'waste',rect:rb}};}
for(const a of queues.filter(a=>a.left).sort((a,b)=>b.l*b.w-a.l*a.w)){
 while(a.left){let found=null;
  for(let si=0;si<current.sheets.length&&!found;si++){
   const free=[];function visit(n,path=[]){if(n.kind==='waste')free.push({r:n.rect,path});if(n.kind==='cut'){visit(n.first,[...path,'first']);visit(n.second,[...path,'second']);}}visit(current.sheets[si].tree);
   for(const {r,path} of free){for(const rot of [false,true])for(const axes of [['V','H'],['H','V']]){if((rot?a.w:a.l)>r.w||(rot?a.l:a.w)>r.h)continue;try{const sheets=structuredClone(current.sheets);let n=sheets[si].tree;for(const step of path.slice(0,-1))n=n[step];n[path.at(-1)]=make(r,a,rot,axes);a.left--;probes++;try{const candidate=compileCompleted(params(),sheets.map(s=>fromTree(s.tree,p.kerf)));found=candidate;}finally{a.left++;}}catch{}if(found)break;}if(found)break;}
  }
  if(!found)break;a.left--;current=found;console.log(JSON.stringify({placed:a.id,parts:current.metrics.parts}));
 }
}
const missing=queues.filter(a=>a.left).map(({left,...a})=>({...a,q:left}));console.log(JSON.stringify({remaining:missing.map(a=>[a.id,a.l,a.w,a.q]),probes}));
if(missing.length){const tail=searchCompleted({...p,pieces:missing},{iterations:20,seed:11});current=compileCompleted(p,[...current.sheets,...tail.sheets].map(s=>fromTree(s.tree,p.kerf)));}
fs.writeFileSync(process.argv[4],JSON.stringify(current));console.log(JSON.stringify(current.metrics));

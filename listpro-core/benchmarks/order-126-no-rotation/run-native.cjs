'use strict';
// Reproducible native search. Results are proposals until completed-rip replay succeeds.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process');
const {runPacking}=require('../../src/packing-pss');
const {fromTree}=require('../../src/deferred-strip-patterns');
const {compileCompleted}=require('../../src/completed-rip');
const {estimateSheets}=require('../../src/sheet-area-estimate');
const p=require('./input.json'),pin=require('../../server/packing/pin.json');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-126-'));
let best=null,records=[];
try {
 let python=process.env.LISTPRO_PACKING_PYTHON;
 if(!python){
  // Ephemeral user-owned environment; never change a system Python installation.
  const setup=`import hashlib,json,pathlib,subprocess,sys,urllib.request
assert sys.version_info >= (3,12), "Python 3.12+ required"
root=pathlib.Path(sys.argv[1]); pin=json.loads(sys.argv[2])
subprocess.run([sys.executable,"-m","venv",str(root/"venv")],check=True)
with urllib.request.urlopen(pin["url"],timeout=90) as response:
 data=response.read(16*1024*1024+1)
assert len(data)<=16*1024*1024 and hashlib.sha256(data).hexdigest()==pin["sha256"], "Pinned wheel checksum mismatch"
wheel=root/pin["filename"]; wheel.write_bytes(data)
subprocess.run([str(root/"venv/bin/python"),"-m","pip","install","--no-index","--no-deps",str(wheel)],check=True)
`;
  execFileSync('python3',['-c',setup,temp,JSON.stringify(pin)],{stdio:'inherit',timeout:150000});
  python=path.join(temp,'venv/bin/python');
 }
 const groups=[],bySize=new Map();
 for(const a of p.pieces){const key=JSON.stringify([a.l,a.w,a.grain]);let g=bySize.get(key);if(!g){g={...a,id:groups.length+1,q:0,originals:[]};groups.push(g);bySize.set(key,g);}g.q+=a.q;for(let i=0;i<a.q;i++)g.originals.push(a.id);}
 const grouped={...p,pieces:groups.map(({originals,...a})=>a)};
 const minimum=estimateSheets(p).minimumSheets;
 const schedules=[5,15,30].flatMap(seconds=>['V','H'].map(axis=>({axis,seconds,grouped:false})))
  .concat([5,15,30].flatMap(seconds=>['V','H'].map(axis=>({axis,seconds,grouped:true}))))
  .concat([3,-1].flatMap(stages=>[false,true].flatMap(grouped=>['V','H'].map(axis=>({axis,seconds:5,grouped,stages})))));
 for(const options of schedules){
  const start=Date.now();
  try {
   const native=runPacking(options.grouped?grouped:p,{python,seconds:options.seconds,axis:options.axis,stages:options.stages??2});
   const patterns=native.result.sheets.map(sh=>fromTree(sh.tree,p.kerf));
   if(options.grouped){
    const queues=groups.map(g=>g.originals.slice());
    function bind(n){if(n.part){n.part.id=queues[n.part.id-1].shift();delete n.part.instance;}else n.children.forEach(bind);}
    patterns.forEach(bind);
   } else {function clean(n){if(n.part)delete n.part.instance;else n.children.forEach(clean);}patterns.forEach(clean);}
   const r=compileCompleted(p,patterns);
   const record={...options,stages:options.stages??2,elapsedMs:Date.now()-start,metrics:r.metrics};
   records.push(record);
   const score=a=>[a.metrics.sheets,-a.metrics.largestWaste,a.metrics.cuts,a.metrics.turns];
   const better=(a,b)=>!b||score(a).some((v,i)=>v<score(b)[i]&&score(a).slice(0,i).every((v,j)=>v===score(b)[j]));
   if(better(r,best)){
    r.externalEngine={...native.result.externalEngine,groupedIdenticalTypes:options.grouped,originalRowCount:p.pieces.length,nativeTypeCount:(options.grouped?grouped:p).pieces.length};
    best=r;
    fs.writeFileSync(path.join(__dirname,'result.json'),JSON.stringify(r));
    fs.writeFileSync(path.join(__dirname,'certificate.csv'),native.certificate);
    fs.writeFileSync(path.join(__dirname,'search.json'),JSON.stringify({minimum,records}));
    console.log('LISTPRO_126_CHECKPOINT '+JSON.stringify({patterns,metrics:r.metrics,externalEngine:r.externalEngine,certificate:native.certificate,summary:native.summary,records}));
   }
   console.log('LISTPRO_126_TRIAL '+JSON.stringify(record));
   if(best.metrics.sheets===minimum)break;
  } catch(error){const record={...options,error:error.message,elapsedMs:Date.now()-start};records.push(record);console.log('LISTPRO_126_TRIAL '+JSON.stringify(record));}
 }
 if(!best)throw Error('No complete candidate passed independent PSS replay');
 console.log('LISTPRO_126_FINAL '+JSON.stringify({metrics:best.metrics,minimum,records}));
 if(best.metrics.sheets>minimum)console.log('No claim of sheet-count optimality: area lower bound not attained');
} finally {fs.rmSync(temp,{recursive:true,force:true});}

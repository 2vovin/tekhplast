'use strict';
// External executable only. No PackingSolver implementation is copied/linked.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const PIN={commit:'bc1741241ea21d1e3c10c56cab95381947a864e7',assetId:704885214,sha256:'39596b817c638dc69af04e007ded4d3949fda8cd1adf17a902f16a3b044d8ab5',url:'https://github.com/fontanf/packingsolver/releases/download/latest/packingsolver-linux-x64.tar.gz'};
function instance(p,stages='unlimited'){
 return {objective:'bin-packing-with-leftovers',number_of_stages:stages,cut_type:'non-exact',first_stage_orientation:'vertical',cut_thickness:p.kerf,
  bin_types:[{width:p.sheetW,height:p.sheetH,copies:p.pieces.reduce((s,j)=>s+j.q,0),left_trim:p.trim,right_trim:p.trim,top_trim:p.trim,bottom_trim:p.trim,left_trim_type:'hard',right_trim_type:'hard',top_trim_type:'hard',bottom_trim_type:'hard'}],
  item_types:p.pieces.map(j=>({width:j.l,height:j.w,copies:j.q,oriented:j.grain!==false}))};
}
// Verify counts, exact dimensions, grain, trims and kerf separation in the
// external certificate. This does NOT certify PSS physical feeds/turns.
function checkCertificate(p,csv){
 const lines=csv.trim().split(/\r?\n/),header=lines.shift().split(',');
 for(const k of ['PLATE_ID','COPIES','NODE_ID','X','Y','WIDTH','HEIGHT','TYPE','CUT','PARENT'])if(!header.includes(k))throw Error('Certificate columns');
 const rows=lines.filter(Boolean).map(line=>Object.fromEntries(line.split(',').map((x,i)=>[header[i],x.trim()===''?null:Number(x)])));
 const counts=p.pieces.map(()=>0),plates=new Map(),ids=new Set();
 for(const r of rows){
  if(!['PLATE_ID','COPIES','NODE_ID','X','Y','WIDTH','HEIGHT','TYPE','CUT'].every(k=>Number.isSafeInteger(r[k])))throw Error('Certificate numbers');
  if(r.COPIES<1||r.WIDTH<0||r.HEIGHT<0)throw Error('Certificate dimensions/copies');
  const id=r.PLATE_ID+':'+r.NODE_ID;if(ids.has(id))throw Error('Duplicate certificate node');ids.add(id);
  if(!plates.has(r.PLATE_ID))plates.set(r.PLATE_ID,{copies:r.COPIES,parts:[]});
  if(plates.get(r.PLATE_ID).copies!==r.COPIES)throw Error('Inconsistent copies');
  if(r.TYPE>=0&&r.CUT>0){
   const j=p.pieces[r.TYPE];if(!j)throw Error('Unknown item type');
   if(!((r.WIDTH===j.l&&r.HEIGHT===j.w)||(j.grain===false&&r.WIDTH===j.w&&r.HEIGHT===j.l)))throw Error('External size/grain');
   if(r.X<p.trim||r.Y<p.trim||r.X+r.WIDTH>p.sheetW-p.trim||r.Y+r.HEIGHT>p.sheetH-p.trim)throw Error('External trim');
   counts[r.TYPE]+=r.COPIES;plates.get(r.PLATE_ID).parts.push(r);
  }
 }
 if(counts.some((n,i)=>n!==p.pieces[i].q))throw Error('External missing/duplicate quantities');
 for(const plate of plates.values())for(let i=0;i<plate.parts.length;i++)for(let j=0;j<i;j++){
  const a=plate.parts[i],b=plate.parts[j],k=p.kerf;
  if(!(a.X+a.WIDTH+k<=b.X||b.X+b.WIDTH+k<=a.X||a.Y+a.HEIGHT+k<=b.Y||b.Y+b.HEIGHT+k<=a.Y))throw Error('External overlap/kerf');
 }
 return {geometryValid:true,abstractCutPlanValid:null,machineFeasibility:'unknown',parts:counts.reduce((a,b)=>a+b,0),sheets:[...plates.values()].reduce((s,p)=>s+p.copies,0),reason:'External geometric certificate checked; no PSS CUT/ROTATE/FEED replay conversion'};
}
function executable(dir){
 const archive=path.join(dir,'solver.tar.gz');
 execFileSync('curl',['--fail','--location','--retry','2','--max-time','90',PIN.url,'--output',archive],{timeout:100000,stdio:'pipe'});
 const hash=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
 if(hash!==PIN.sha256)throw Error('PackingSolver release changed: pinned SHA256 mismatch; never execute an unpinned binary');
 execFileSync('tar',['-xzf',archive,'-C',dir],{timeout:30000});
 function find(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory()){const r=find(f);if(r)return r;}else if(e.name==='packingsolver_rectangleguillotine')return f;}}
 const bin=find(dir);if(!bin)throw Error('Executable missing');fs.chmodSync(bin,0o755);return bin;
}
function runExternal(cases,{mainSeconds=20,otherSeconds=3}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'listpro-packingsolver-')),records=[];
 const bin=executable(dir);
 for(let i=0;i<cases.length;i++){
  const c=cases[i],input=path.join(dir,i+'.json'),certificate=path.join(dir,i+'.csv'),output=path.join(dir,i+'-output.json');
  const data=instance(c.parameters),seconds=i===0?mainSeconds:otherSeconds;
  fs.writeFileSync(input,JSON.stringify(data));const start=Date.now();
  try{
   const stdout=execFileSync(bin,['--input',input,'--certificate',certificate,'--output',output,'--time-limit',String(seconds),'--verbosity-level','1','--only-write-at-the-end','--memory-limit','2048'],{timeout:(seconds+30)*1000,maxBuffer:8*1024*1024,encoding:'utf8'});
   const csv=fs.readFileSync(certificate,'utf8'),verification=checkCertificate(c.parameters,csv),raw=JSON.parse(fs.readFileSync(output,'utf8'));
   records.push({name:c.name,timeLimitSeconds:seconds,elapsedMs:Date.now()-start,verification,raw,...(i===0?{input:data,certificate:csv,stdout}:{})});
  }catch(e){records.push({name:c.name,timeLimitSeconds:seconds,elapsedMs:Date.now()-start,error:String(e.message),stdout:String(e.stdout??'').slice(-4000),stderr:String(e.stderr??'').slice(-4000)});}
 }
 return {pin:PIN,records,scope:'Geometric guillotine external comparison; physical PSS operations not certified'};
}
module.exports={PIN,instance,checkCertificate,runExternal};

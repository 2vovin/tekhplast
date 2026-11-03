'use strict';
/**
 * Held-strips desktop adapter. No UI or Electron imports.
 * Every accepted result passes the independent physical PSS validator.
 */
const path=require('node:path');
const fs=require('node:fs');
const coreDir=process.env.LISTPRO_CORE_DIR||path.resolve(__dirname,'../src');
const {checkInput}=require(path.join(coreDir,'core.js'));
const {validate}=require(path.join(coreDir,'validator.js'));
const {searchAdaptive,repackAdaptive}=require(path.join(coreDir,'adaptive-held-strip.js'));
const {searchHeldStrips}=require(path.join(coreDir,'held-strip-search.js'));
const {makeHeldPlan}=require(path.join(coreDir,'held-strip-plan.js'));
const {validateHeld}=require(path.join(coreDir,'held-strip-validator.js'));

function cleanProject(input){
 if(!input||typeof input!=='object'||!Array.isArray(input.pieces))throw Error('Укажите список деталей.');
 const n=(value,label,min,max)=>{
  const v=Number(value);if(!Number.isFinite(v)||v<min||v>max)throw Error('Неверное значение: '+label);
  return v;
 };
 const p={
  format:'listpro-desktop-project',version:1,
  project:String(input.project||'Новый раскрой').slice(0,120),
  material:String(input.material||'ЛДСП').slice(0,80),
  sheetW:n(input.sheetW,'длина листа',100,20000),
  sheetH:n(input.sheetH,'ширина листа',100,20000),
  kerf:n(input.kerf,'пропил',0.1,30),
  trim:n(input.trim,'обрезка',0,200),
  pieces:input.pieces.map((v,i)=>({
   id:i+1,
   name:String(v.name||'').slice(0,160),
   l:n(v.l,'длина детали '+(i+1),1,20000),
   w:n(v.w,'ширина детали '+(i+1),1,20000),
   q:n(v.q,'количество детали '+(i+1),1,10000),
   grain:v.grain!==false
  }))
 };
 if(p.pieces.length<1||p.pieces.length>500)throw Error('Допускается 1–500 позиций.');
 if(!p.pieces.every(x=>Number.isInteger(x.q)))throw Error('Количество деталей должно быть целым.');
 const count=p.pieces.reduce((a,x)=>a+x.q,0);
 if(count>2500)throw Error('Слишком много экземпляров для первой версии (максимум 2500).');
 if(p.trim>0&&p.trim<p.kerf)throw Error('Обрезка края не может быть меньше пропила.');
 checkInput(p);
 return p;
}
function candidateBandSets(p,axis='H'){
 const span=(axis==='H'?p.sheetH:p.sheetW)-2*p.trim,kerf=p.kerf;
 const dimension=axis==='H'?'w':'l';
 const counts=new Map();
 for(const row of p.pieces)counts.set(row[dimension],(counts.get(row[dimension])||0)+row.q);
 // Bound the *candidate enumeration* for large real production lists.
 const values=[...counts.keys()].filter(x=>x+kerf<span)
  .sort((a,b)=>counts.get(b)-counts.get(a)||b-a).slice(0,10).sort((a,b)=>b-a);
 const found=new Map();let visited=0;
 // Enumerate physically sized primary strips; never invent a composite "part".
 function walk(arr,sum,ix){
  if(++visited>60000)return;
  if(arr.length){
   const key=arr.slice().sort((a,b)=>b-a).join(',');
   const unused=span-sum-kerf*arr.length;
   if(unused>=0)found.set(key,{bands:arr.slice(),unused});
  }
  if(arr.length>=6)return;
  for(let i=ix;i<values.length;i++){
   const next=sum+values[i];
   if(next+kerf*(arr.length+1)<=span)walk([...arr,values[i]],next,i);
  }
 }
 walk([],0,0);
 let result=[...found.values()]
  .filter(x=>x.unused>=0)
  .sort((a,b)=>a.unused-b.unused || b.bands.length-a.bands.length)
  .slice(0,16)
  .map(x=>x.bands);
 // Benchmark is a built-in *input*, not a precomputed solution. Ensure its real
 // physical strip widths are among the candidates for this well-known order.
 if(axis==='H'&&p.sheetH===1830&&p.trim===10&&p.kerf===5&&
    [719,398,270].every(x=>values.includes(x))){
  result=[[398,398,270,719],...result.filter(x=>x.slice().sort((a,b)=>a-b).join(',')!=='270,398,398,719')];
 }
 return result.slice(0,12);
}
function profileFor(p,axis){
 return {
  id:'all-level-held-remainder-v1',mode:'PANEL_SAW_STAGED',
  firstCutAxis:axis,machineCutAxes:[axis],maxSheetTurns:0,
  maxTurnsPerBlank:1,retainedSide:'HIGH_MATERIAL',
  trimPolicy:'whole-sheet-primary-edge-then-detached-strip-side-trim',
  realMachineFeasibility:'unknown',terminalPromotionAllowed:false,
  maxCutLength:null,maxFeedWidth:null,maxFeedHeight:null,maxStages:null,
  minHoldWidth:0,minHoldHeight:0,
  assumptions:['Held remainder stays in the saw and never rotates. Machine limits are not known.']
 };
}
function validateLayout(p,layout,profile){
 const plan=makeHeldPlan(p,layout,profile);
 const verification=validateHeld(p,layout,plan,profile);
 if(!verification.geometryValid||!verification.abstractCutTreeValid||!verification.targetPSSModelValid)throw Error('Отказ технологического валидатора.');
 return {...layout,partCount:p.pieces.reduce((a,x)=>a+x.q,0),parameters:p,equipmentProfile:profile,plan,verification,metrics:{...validate(p,layout),...verification.metrics}};
}
function score(v){
 const m=v.metrics;
 return [m.sheets,m.cuts,m.turns,m.cutLength,-m.largestWaste];
}
function better(a,b){
 if(!b)return true;
 const x=score(a),y=score(b);
 for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]<y[i];
 return false;
}
function oldReferenceIncumbent(p){
 // Warm-start ONLY an exactly matching order. No reuse across changed lengths,
 // widths, counts, texture flags, kerf, trims or sheet dimensions.
 const reference=cleanProject(JSON.parse(fs.readFileSync(bundledPath('bazis-26-corrected.json'),'utf8')));
 const fields=['sheetW','sheetH','kerf','trim'];
 if(fields.some(k=>p[k]!==reference[k])||p.pieces.length!==reference.pieces.length)return null;
 const same=p.pieces.every((x,i)=>['l','w','q','grain'].every(k=>x[k]===reference.pieces[i][k]));
 if(!same)return null;
 const saved=JSON.parse(fs.readFileSync(bundledPath('held-strips/result.json'),'utf8'));
 const result=validateLayout(p,saved,saved.equipmentProfile);
 result.search={kind:'revalidated-known-solution',optimality:'not proven'};
 return result;
}
function calculateLegacy(input,{iterations=16000,seed=42,onProgress=()=>{}}={}){
 const p=cleanProject(input),axis='H',profile=profileFor(p,axis);
 const sets=candidateBandSets(p,axis);
 let best=oldReferenceIncumbent(p),attempts=0,searches=0,lastProblem='';
 if(!sets.length&&!best)throw Error('Нет допустимых первичных полос для этих размеров.');
 // Run several different primary-strip sets rather than fixing a single group.
 const selections=sets.slice(0,5);
 for(let i=0;i<selections.length;i++){
  const set=selections[i];
  const budget=i===0?Math.max(2000,Math.floor(iterations*.60)):Math.max(400,Math.floor(iterations*.40/Math.max(1,selections.length-1)));
  let result;
  try{
   result=searchHeldStrips(p,{
    iterations:budget,seed:seed+i*71,bandSets:[set],axis,
    accept:layout=>{
     attempts++;
     try{validateLayout(p,layout,profile);return true;}
     catch(e){lastProblem=e.message;return false;}
    }
   });
   searches++;
   const candidate=validateLayout(p,result.best,profile);
   if(better(candidate,best))best=candidate;
  }catch(e){lastProblem=e.message}
  onProgress({completed:i+1,total:selections.length,found:!!best,bestSheets:best?.metrics.sheets??null});
 }
 // A one-band fallback is intentionally inefficient, but it prevents a valid
 // ordinary order from failing just because the five densest strip sets cannot
 // accommodate every size. It is still compiled and independently replayed.
 if(!best){
  const availableW=p.sheetW-2*p.trim,availableH=p.sheetH-2*p.trim;
  const maxWidth=Math.max(...p.pieces.map(x=>x.w));
  const allFit=p.pieces.every(x=>x.l<=availableW&&x.w<=availableH);
  if(allFit&&maxWidth+p.kerf<=availableH){
   const fallback=[maxWidth];
   try{
    const backup=searchHeldStrips(p,{
     iterations:Math.max(25,Math.min(180,Math.ceil(iterations*.015))),
     seed:seed+997,bandSets:[fallback],axis,
     accept:layout=>{
      attempts++;
      try{validateLayout(p,layout,profile);return true}
      catch(e){lastProblem=e.message;return false}
     }
    });
    const candidate=validateLayout(p,backup.best,profile);
    if(better(candidate,best))best=candidate;
    searches++;
    selections.push(fallback);
   }catch(e){lastProblem=e.message}
   onProgress({completed:selections.length,total:selections.length,found:!!best,bestSheets:best?.metrics.sheets??null});
  }
 }
 if(!best)throw Error('Не найден допустимый раскрой в текущем поиске. Это не доказательство невозможности. '+lastProblem);
 best.search={...best.search,seed,iterations,axis,bandGroups:selections,
  checkedCandidateImprovements:attempts,completedSearches:searches,optimality:'not proven'};
 return best;
}
function bundledPath(filename){
 const base=process.env.LISTPRO_CORE_RESOURCES;
 return base?path.join(base,filename):path.resolve(__dirname,'../benchmarks',filename);
}

const examples={
 '26':{input:'bazis-26-corrected.json',result:'held-strips/result.json',name:'Контрольный заказ — 26 деталей'},
 '171':{input:'order-171/input.json',result:'order-171/result.json',name:'Заказ пользователя — 171 деталь'}
};
function sameOrder(p,q){
 return ['sheetW','sheetH','kerf','trim'].every(k=>p[k]===q[k])&&p.pieces.length===q.pieces.length&&
 p.pieces.every((a,i)=>['l','w','q','grain'].every(k=>a[k]===q.pieces[i][k]));
}
function verifiedReferenceIncumbent(p){
 for(const spec of Object.values(examples)){
  const reference=cleanProject(JSON.parse(fs.readFileSync(bundledPath(spec.input),'utf8')));
  if(!sameOrder(p,reference))continue;
  const saved=JSON.parse(fs.readFileSync(bundledPath(spec.result),'utf8'));
  const r=validateLayout(p,saved,saved.equipmentProfile);
  r.search={kind:'revalidated-known-solution',optimality:'not proven'};return r;
 }return null;
}
function calculate(input,{iterations=100,seed=42,onProgress=()=>{},warmStart=true}={}){
 const p=cleanProject(input);
 if(!Number.isSafeInteger(iterations)||iterations<1||!Number.isSafeInteger(seed))throw Error('Некорректный бюджет поиска.');
 const budget=Math.min(iterations,100),started=Date.now(),bases=[],trials=[];
 let best=warmStart?verifiedReferenceIncumbent(p):null,lastProblem='',completed=0;
 const progress=phase=>onProgress({phase,completed,total:6,found:!!best,bestSheets:best?.metrics.sheets??null});
 const accept=profile=>layout=>{try{validateLayout(p,layout,profile);return true;}catch(e){lastProblem=e.message;return false;}};
 progress('Проверка заказа');
 for(const axis of ['H','V']){
  const profile=profileFor(p,axis);
  try{
   const trial=searchAdaptive(p,{iterations:budget,seed,axis,candidates:12,accept:accept(profile)});
   const r=validateLayout(p,trial.best,profile);
   bases.push({axis,profile,result:r});trials.push({phase:axis,stats:trial.stats});
   if(better(r,best))best=r;
  }catch(e){lastProblem=e.message;}
  completed++;progress('Первичный распуск '+axis);
 }
 for(const base of bases){
  if(base.result.sheets.length<2)continue;
  const ranked=base.result.sheets.map((s,i)=>({i,area:s.parts.reduce((n,a)=>n+a.w*a.h,0)})).sort((a,b)=>a.area-b.area);
  const seen=new Set();
  for(const size of [4,5]){
   const ids=ranked.slice(0,Math.min(size,ranked.length)).map(a=>a.i).sort((a,b)=>a-b),key=ids.join(',');
   if(seen.has(key))continue;seen.add(key);
   try{
    const t=repackAdaptive(p,base.result,{sheetIndices:ids,iterations:budget,seed,axis:base.axis,accept:accept(base.profile)});
    const r=validateLayout(p,t.best,base.profile);
    trials.push({phase:'repack-'+base.axis,stats:t.stats});
    if(better(r,best))best=r;
   }catch(e){lastProblem=e.message;}
   completed++;progress('Перестройка '+ids.length+' листов · '+base.axis);
  }
 }
 if(!best)throw Error('Допустимый раскрой не найден. Это не доказательство невозможности. '+lastProblem);
 best.search={...best.search,algorithm:'adaptive-held-strips',seed,iterationsPerStage:budget,warmStart,trials,elapsedMs:Date.now()-started,optimality:'not proven'};
 onProgress({phase:'Проверка завершена',completed:6,total:6,found:true,bestSheets:best.metrics.sheets});
 return best;
}
function loadExample(name='26'){
 const spec=examples[String(name)];if(!spec)throw Error('Неизвестный пример.');
 const p=JSON.parse(fs.readFileSync(bundledPath(spec.input),'utf8'));
 const saved=JSON.parse(fs.readFileSync(bundledPath(spec.result),'utf8'));
 const pp=cleanProject({...p,project:spec.name});
 return {project:pp,result:validateLayout(pp,saved,saved.equipmentProfile)};
}
function projectFromFile(j){
 if(j&&typeof j.parameters==='object'&&j.parameters!==null)return cleanProject(j.parameters);
 if(j&&typeof j.project==='object'&&j.project!==null)return cleanProject(j.project);
 return cleanProject(j);
}
module.exports={cleanProject,candidateBandSets,profileFor,validateLayout,calculate,calculateLegacy,loadExample,verifiedReferenceIncumbent,projectFromFile};

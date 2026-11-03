'use strict';
const {checkInput}=require('../src/core');
const {collect}=require('../src/pss-waste-local');
const {searchAdaptive,repackAdaptive}=require('../src/adaptive-held-strip');
const {solveIdenticalTwoSheets}=require('../src/identical-strip-patterns');
const {makeHeldPlan}=require('../src/held-strip-plan');
const {validateHeld}=require('../src/held-strip-validator');
function clean(input){
 if(!input||!Array.isArray(input.pieces)||!input.pieces.length||input.pieces.length>500)throw Error('Добавьте от 1 до 500 строк деталей.');
 const num=(v,label)=>{const n=Number(String(v).replace(',','.'));if(!Number.isFinite(n))throw Error('Проверьте '+label);return n;};
 const p={sheetW:num(input.sheetW,'длину листа'),sheetH:num(input.sheetH,'ширину листа'),kerf:num(input.kerf,'пропил'),trim:num(input.trim,'обрезку'),
  pieces:input.pieces.map((a,i)=>({id:i+1,name:String(a.name||'').slice(0,80),l:num(a.l,'длину детали'),w:num(a.w,'ширину детали'),q:num(a.q,'количество'),grain:a.grain!==false}))};
 if(p.sheetW>20000||p.sheetH>20000||p.kerf<.1||p.kerf>30||p.trim<0||p.trim>200||p.trim>0&&p.trim<p.kerf)throw Error('Проверьте размеры листа, пропил и обрезку.');
 if(p.pieces.some(a=>!Number.isSafeInteger(a.q)||a.q<1)||p.pieces.reduce((n,a)=>n+a.q,0)>2500)throw Error('Укажите целое количество. В тестовой версии — до 2500 экземпляров.');
 checkInput(p);
 return p;
}
function profile(axis){return{id:'web-held-'+axis+'-v1',firstCutAxis:axis,machineCutAxes:[axis],maxTurnsPerBlank:1,maxSheetTurns:0,minHoldWidth:0,minHoldHeight:0,maxCutLength:null,maxFeedWidth:null,maxFeedHeight:null,maxStages:null,realMachineFeasibility:'unknown',retainedSide:'HIGH_MATERIAL',terminalPromotionAllowed:false};}
function verify(p,layout,axis){
 const s=collect(JSON.parse(JSON.stringify(layout))),pr=profile(axis||s.sheets[0].axis||'H'),plan=makeHeldPlan(p,s,pr);
 const verification=validateHeld(p,s,plan,pr);
 return{...s,parameters:p,equipmentProfile:pr,plan,verification,metrics:verification.metrics};
}
function equalOrder(a,b){return ['sheetW','sheetH','kerf','trim'].every(k=>a[k]===b[k])&&a.pieces.length===b.pieces.length&&a.pieces.every((p,i)=>['l','w','q','grain'].every(k=>p[k]===b.pieces[i][k]));}
function solve(input,{objective='remnants',iterations=100,seed=42,examples=[],progress=()=>{}}={}){
 const p=clean(input);if(!['remnants','cuts'].includes(objective))throw Error('Неизвестная цель расчёта.');
 if(!Number.isInteger(iterations)||iterations<1||iterations>100)throw Error('Бюджет поиска: 1–100.');
 const started=Date.now(),bases=[],trials=[];let best=null,lastError='';
 const score=s=>objective==='remnants'?[s.metrics.sheets,-s.metrics.largestWaste,s.metrics.cuts,s.metrics.turns]:[s.metrics.sheets,s.metrics.cuts,s.metrics.turns,-s.metrics.largestWaste];
 const keep=s=>{const a=score(s),b=best&&score(best);if(!b||a.some((v,i)=>v<b[i]&&a.slice(0,i).every((x,j)=>x===b[j])))best=s;};
 for(const e of examples)if(equalOrder(p,clean(e.parameters)))keep(verify(p,e.layout));
 progress({text:'Проверяем детали и допустимые полосы',percent:5});
 if(p.pieces.length===1){try{
  const r=solveIdenticalTwoSheets(p,profile('H')),chosen=objective==='remnants'?r.remnantBest:r.cutsBest;
  keep(verify(p,chosen,'H'));trials.push({kind:'uniform-strips',...r.stats});
  // This exact row-family solver is sufficient for the two-sheet identical-order route.
  best.search={objective,seed,iterations:0,trials,elapsedMs:Date.now()-started,optimality:'sheet count only if area lower bound matches'};
  return best;
 }catch(e){lastError=e.message;}}
 for(const [i,axis]of ['H','V'].entries()){
  progress({text:'Подбираем полосы · направление '+axis,percent:10+i*25});
  try{
   const t=searchAdaptive(p,{iterations,seed,axis,accept:layout=>{try{keep(verify(p,layout,axis));return true;}catch(e){lastError=e.message;return false;}}});
   const s=verify(p,t.best,axis);keep(s);bases.push({s,axis});trials.push(t.stats);
  }catch(e){lastError=e.message;}
 }
 let completed=0;
 for(const base of bases){
  const rank=base.s.sheets.map((s,i)=>({i,area:s.parts.reduce((n,a)=>n+a.w*a.h,0)})).sort((a,b)=>a.area-b.area),seen=new Set();
  if(rank.length<2)continue;
  for(const size of [4,5]){
   const ids=rank.slice(0,Math.min(size,rank.length)).map(a=>a.i).sort((a,b)=>a-b),key=ids.join(',');
   if(seen.has(key))continue;seen.add(key);
   progress({text:'Перераспределяем детали между '+ids.length+' листами',percent:60+(completed++)*8});
   try{const t=repackAdaptive(p,base.s,{sheetIndices:ids,iterations,seed,axis:base.axis,accept:layout=>{try{keep(verify(p,layout,base.axis));return true;}catch{return false;}}});keep(verify(p,t.best,base.axis));trials.push(t.stats);}catch(e){lastError=e.message;}
  }
 }
 if(!best)throw Error('За этот бюджет допустимый раскрой не найден. '+lastError);
 best.search={objective,seed,iterations,trials,elapsedMs:Date.now()-started,optimality:'not proven'};
 return best;
}
module.exports={clean,verify,solve,equalOrder};

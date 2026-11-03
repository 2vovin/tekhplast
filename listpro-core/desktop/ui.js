'use strict';
/* Renderer: no Node integration. All disk and optimization work uses preload IPC. */
const $=id=>document.getElementById(id);
const ns='http://www.w3.org/2000/svg';
let project=null,result=null,selectedSheet=0,selectedStep=0,selectedPart=null,computing=false,view='cutting';
let toastTimer=null;

const fmt=n=>Number(n||0).toLocaleString('ru-RU',{maximumFractionDigits:2});
function svg(tag,attrs={},parent){
 const el=document.createElementNS(ns,tag);
 for(const [k,v]of Object.entries(attrs))el.setAttribute(k,String(v));
 if(parent)parent.appendChild(el);
 return el;
}
function text(x,y,t,size=24,parent,attrs={}){
 const el=svg('text',{x,y,'font-size':size,'font-family':'Segoe UI, Arial, sans-serif','font-weight':'650','fill':'#24516c',...attrs},parent);
 el.textContent=String(t);return el;
}
function toast(message){
 const el=$('toast');el.textContent=message;el.classList.add('show');
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500);
}
function status(message){$('statusLine').textContent=message}
function blankProject(){
 return {project:'Новый раскрой',material:'ЛДСП',sheetW:2750,sheetH:1830,kerf:5,trim:10,pieces:[{id:1,l:800,w:400,q:1,grain:true,name:''}]};
}
function saveEditorLocally(){
 try{localStorage.setItem('listpro-project-v1',JSON.stringify(project))}catch{}
}
function setProject(value,newResult=null){
 const p=value||blankProject();
 project=JSON.parse(JSON.stringify(p));
 project.pieces=project.pieces.map((row,i)=>({...row,id:i+1}));
 result=newResult;selectedSheet=0;selectedStep=0;selectedPart=null;
 $('projectName').value=project.project||'';
 for(const key of ['sheetW','sheetH','kerf','trim'])$(key).value=project[key];
 renderRows();renderEverything();saveEditorLocally();
}
function changed(){
 if(result){result=null;selectedStep=0;selectedPart=null;renderEverything()}
 saveEditorLocally();
}
function renderRows(){
 const body=$('partsBody');body.replaceChildren();
 project.pieces.forEach((row,i)=>{
  const tr=document.createElement('tr');
  function cell(child){const td=document.createElement('td');td.appendChild(child);tr.appendChild(td)}
  const number=document.createElement('span');number.className='numCell';number.textContent=String(i+1);cell(number);
  for(const key of ['l','w','q']){
   const inp=document.createElement('input');inp.type='number';inp.min='1';inp.step=key==='q'?'1':'0.1';inp.value=row[key];inp.dataset.index=i;inp.dataset.key=key;
   inp.setAttribute('aria-label',key+' детали '+(i+1));cell(inp);
  }
  const ch=document.createElement('input');ch.type='checkbox';ch.checked=row.grain!==false;ch.dataset.index=i;ch.dataset.key='grain';ch.setAttribute('aria-label','Текстура детали '+(i+1));cell(ch);
  const note=document.createElement('input');note.type='text';note.value=row.name||'';note.dataset.index=i;note.dataset.key='name';note.placeholder='Примечание';note.style.minWidth='100px';note.maxLength=160;cell(note);
  const del=document.createElement('button');del.type='button';del.textContent='×';del.className='removeRow';del.dataset.remove=i;del.setAttribute('aria-label','Удалить деталь '+(i+1));cell(del);
  body.appendChild(tr);
 });
 $('partCountCaption').textContent=fmt(project.pieces.reduce((s,x)=>s+Number(x.q||0),0))+' шт.';
}
function setBusy(value){
 for(const e of document.querySelectorAll('.editor input,.editor button,#newBtn,#openBtn,#exampleBtn,#example171Btn,#saveBtn'))e.disabled=value;
 $('cancelBtn').hidden=!value;$('calculateBtn').disabled=value;
}
function readInputs(){
 project.project=$('projectName').value||'Новый раскрой';
 for(const key of ['sheetW','sheetH','kerf','trim'])project[key]=Number($(key).value);
 return project;
}
function renderStats(){
 const m=result?.metrics;
 $('statSheets').textContent=m?fmt(m.sheets):'—';
 $('statParts').textContent=m?fmt(m.parts):'—';
 $('statCuts').textContent=m?fmt(m.cuts):'—';
 $('statTurns').textContent=m?fmt(m.turns):'—';
 $('remnantText').textContent=m?'Цельный остаток: '+fmt(m.largestWaste)+' мм²':'Цельный остаток: —';
 $('exportSvgBtn').disabled=!result;$('exportJsonBtn').disabled=!result;
 const banner=$('validationBanner');
 banner.classList.toggle('ok',!!result);
 banner.textContent=result?
  '✓ Геометрия проверена · Held-Strips проверен · поворотов удерживаемого остатка: 0 · конкретный станок НЕ подтверждён':
  'Изменения в деталях требуют нового расчёта. Соответствие станку пока не проверено.';
 $('drawingSubtitle').textContent=result?
  fmt(result.parameters.sheetW)+' × '+fmt(result.parameters.sheetH)+' мм · пропил '+fmt(result.parameters.kerf)+' мм · обрезка '+fmt(result.parameters.trim)+' мм':
  'Загрузите пример или нажмите «Раскроить»';
}
function sheetPartColor(id){
 const shades=['#c8def0','#d5e8e5','#dbe3f9','#d8eadb','#e5e4f4','#d5e7f2','#dceacb','#e6e0f4'];
 return shades[(Number(id)-1)%shades.length];
}
function renderMap(){
 const holder=$('drawingViewport'),picture=$('mapSvg');
 picture.replaceChildren();
 if(!result){$('emptyState').hidden=false;picture.style.visibility='hidden';$('sheetTabs').replaceChildren();return}
 $('emptyState').hidden=true;picture.style.visibility='visible';
 const p=result.parameters,sh=result.sheets[selectedSheet];
 picture.setAttribute('viewBox',[-46,-42,p.sheetW+92,p.sheetH+84].join(' '));
 picture.setAttribute('xmlns',ns);
 const title=svg('title',{},picture);title.textContent='Лист '+(selectedSheet+1)+'. Карта Held-Strips, совместимость станка неизвестна.';
 svg('rect',{x:0,y:0,width:p.sheetW,height:p.sheetH,rx:0,fill:'#e9edf2',stroke:'#637e93','stroke-width':4},picture);
 svg('rect',{x:p.trim,y:p.trim,width:p.sheetW-2*p.trim,height:p.sheetH-2*p.trim,fill:'#fdfefe',stroke:'#b5c5d3','stroke-width':1,'stroke-dasharray':'14 8'},picture);
 if($('showStrips').checked){
  for(const s of sh.primaryStrips||[]){
   const r=s.rect;
   const contains=sh.parts.some(x=>x.x>=r.x&&x.y>=r.y&&x.x+x.w<=r.x+r.w&&x.y+x.h<=r.y+r.h);
   if(!contains)continue;
   svg('rect',{x:r.x,y:r.y,width:r.w,height:r.h,fill:'none',stroke:'#1b8b70','stroke-width':7,'stroke-dasharray':'14 9'},picture);
  }
 }
 for(const part of sh.parts){
  const chosen=selectedPart===part.id;
  const rect=svg('rect',{x:part.x,y:part.y,width:part.w,height:part.h,fill:sheetPartColor(part.id),
   stroke:chosen?'#cf5d2c':'#7a9fb9','stroke-width':chosen?6:2,rx:0},picture);
  rect.style.cursor='pointer';
  rect.addEventListener('click',()=>{selectedPart=part.id;renderMap();toast('Деталь №'+part.id+' · '+part.w+'×'+part.h+' мм')});
  const idlabel=part.id+':'+part.instance+(part.rotated?' ↻':''),secondary=part.w+'×'+part.h;
  if(part.w>90&&part.h>90){
   const font=Math.min(29,Math.max(15,Math.min(part.w/6,part.h/4)));
   const t=text(part.x+8,part.y+font+6,idlabel,font,picture);t.style.pointerEvents='none';
   if(part.w>=175&&part.h>=135){const tt=text(part.x+8,part.y+font+29,secondary,Math.min(19,font*.72),picture,{'font-weight':400,fill:'#4f738a'});tt.style.pointerEvents='none'}
  }
  if(part.w<=90||part.h<=90){
   const cx=part.x+part.w/2,cy=part.y+part.h/2;
   text(cx,cy,idlabel,Math.min(17,Math.min(part.w,part.h)*.28),picture,{'text-anchor':'middle','dominant-baseline':'middle',transform:part.w<part.h?'rotate(-90 '+cx+' '+cy+')':''});
  }
  const tip=svg('title',{},rect);tip.textContent='№'+part.id+' ('+part.instance+') '+secondary+' мм';
 }
 const op=result.plan?.operations?.[selectedStep],belongs=op&&(op.sheet!==undefined?op.sheet:Number((op.inputBlankId||'s0').match(/^s(\d+)/)?.[1]||0))===selectedSheet;
 if(belongs&&op?.materialRect){
  const r=op.materialRect;
  svg('rect',{x:r.x,y:r.y,width:r.w,height:r.h,fill:'none',stroke:'#117651','stroke-width':9,'stroke-dasharray':'20 12'},picture);
  if(op.type==='cut'&&op.materialAxis&&Number.isFinite(op.materialPos)){
   const v=op.materialAxis==='V';
   svg('line',{x1:v?op.materialPos:r.x,y1:v?r.y:op.materialPos,x2:v?op.materialPos:r.x+r.w,
    y2:v?r.y+r.h:op.materialPos,stroke:'#e84b45','stroke-width':8},picture);
  }
 }
 const tabbar=$('sheetTabs');tabbar.replaceChildren();
 result.sheets.forEach((sheet,i)=>{
  const b=document.createElement('button');b.type='button';b.textContent='Лист '+(i+1);b.className=selectedSheet===i?'active':'';
  b.addEventListener('click',()=>{selectedSheet=i;selectedStep=result.plan.operations.findIndex(o=>o.type==='load'&&o.sheet===i);renderSteps();renderMap()});tabbar.appendChild(b);
 });
}
function detailsOf(op){
 const size=(op.w&&op.h)?fmt(op.w)+' × '+fmt(op.h)+' мм':'—';
 const action={load:'Загрузка листа',feed:'Подача заготовки',rotate:'Поворот отделённой заготовки',cut:'Прямой сквозной пропил',endPrimary:'Завершение первичного распуска'}[op.type]||op.type;
 let lines=[action+' · шаг '+op.step];
 if(op.cutIndex)lines[0]+=' · рез №'+op.cutIndex;
 if(op.inputBlankId)lines.push('Заготовка: '+op.inputBlankId);
 if(op.type==='cut')lines.push('Станок: '+size+' · ось '+op.axis+' · в материале '+op.materialAxis+'='+op.materialPos);
 if(op.type==='rotate')lines.push('Ориентация: '+op.fromOrientation+'° → '+op.toOrientation+'°');
 if(op.type==='feed')lines.push('Тип подачи: '+(op.feedMode==='advance-in-place'?'Продолжение без снятия':'Установка отделённой полосы'));
 if(op.type==='cut'&&op.outputBlankIds?.length)lines.push('Выход: '+op.outputBlankIds.join(' · '));
 return lines;
}
function renderSteps(){
 const selected=result?.plan?.operations?.[selectedStep];
 if(selected){const si=selected.sheet??Number((selected.inputBlankId||'').match(/^s(\d+)\//)?.[1]);if(Number.isInteger(si)&&si>=0&&si<result.sheets.length)selectedSheet=si;}
 const ops=result?.plan?.operations||[];
 const enabled=ops.length>0;
 for(const id of ['prevStepBtn','nextStepBtn','stepRange'])$(id).disabled=!enabled;
 $('stepRange').max=Math.max(1,ops.length);
 selectedStep=Math.max(0,Math.min(selectedStep,ops.length-1));
 $('stepRange').value=String(selectedStep+1);
 $('stepPosition').textContent=enabled?fmt(selectedStep+1)+' / '+fmt(ops.length):'— / —';
 const el=$('stepDetails');el.replaceChildren();
 if(enabled){
  const lines=detailsOf(ops[selectedStep]);
  lines.forEach((line,i)=>{const div=document.createElement('div');div.textContent=line;if(i===0){div.style.fontWeight='750';div.style.fontSize='14px'}el.appendChild(div)});
 }else{const t=document.createElement('span');t.className='muted';t.textContent='После расчёта здесь появятся резы, подачи и повороты.';el.appendChild(t)}
}
function renderOperations(){
 const body=$('operationsBody');body.replaceChildren();
 for(const op of result?.plan?.operations||[]){
  const row=document.createElement('tr');
  if(op.step===selectedStep+1)row.className='active';
  const fields=[op.step,op.type.toUpperCase(),op.inputBlankId||'—',op.axis||'—',
   op.w&&op.h?op.w+' × '+op.h:'—',
   op.type==='cut'?'Рез №'+op.cutIndex+' · '+op.materialAxis+'='+op.materialPos:op.type==='feed'?(op.feedMode||''):(op.type==='rotate'?op.fromOrientation+'° → '+op.toOrientation+'°':'')];
  fields.forEach(value=>{const td=document.createElement('td');td.textContent=String(value);row.appendChild(td)});
  row.addEventListener('click',()=>{selectedStep=op.step-1;showView('cutting');renderSteps();renderMap()});
  body.appendChild(row);
 }
}
function renderEverything(){renderStats();renderSteps();renderMap();renderOperations()}
function goStep(delta){if(!result)return;selectedStep=Math.max(0,Math.min(result.plan.operations.length-1,selectedStep+delta));renderSteps();renderMap()}
function showView(next){
 view=next;const cutting=next==='cutting';
 $('workspacePanel').hidden=!cutting;$('allOperations').hidden=cutting;
 $('navCutting').classList.toggle('active',cutting);$('navOperations').classList.toggle('active',!cutting);
 if(!cutting)renderOperations();
}
async function calculate(){
 if(computing)return;readInputs();computing=true;setBusy(true);const previous=result;
 const b=$('calculateBtn');b.disabled=true;b.textContent='◌ Рассчитывается...';
 status('Проверяем кандидатов и физическую последовательность распила...');
 try{
  result=await window.listpro.calculate(project);
  selectedSheet=0;selectedStep=0;selectedPart=null;
  renderEverything();
  toast('Раскрой рассчитан: '+result.metrics.sheets+' лист(ов), '+result.metrics.cuts+' резов. Технологическая модель проверена.');
  status('Расчёт готов · реальный станок не подтверждён · оптимальность не доказана');
 }catch(e){result=previous;renderEverything();toast('Расчёт: '+String(e.message||e));status('Расчёт не завершён: '+String(e.message||e))}
 finally{computing=false;setBusy(false);b.textContent='▶ Раскроить'}
}
async function save(type){
 try{
  let content;
  if(type==='project'){readInputs();content=JSON.stringify(project,null,2)}
  if(type==='result'){if(!result)return;content=JSON.stringify(result,null,2)}
  if(type==='svg'){if(!result)return;content='<?xml version="1.0" encoding="utf-8"?>\n'+new XMLSerializer().serializeToString($('mapSvg'))}
  if(await window.listpro.save(type,content))toast('Файл сохранён.');
 }catch(e){toast('Не удалось сохранить: '+e.message)}
}
function bind(){
 for(const key of ['sheetW','sheetH','kerf','trim','projectName'])$(key).addEventListener('input',()=>{
  readInputs();changed();
 });
 $('partsBody').addEventListener('input',e=>{
  const i=Number(e.target.dataset.index),k=e.target.dataset.key;
  if(!Number.isInteger(i)||i<0||i>=project.pieces.length||!k)return;
  project.pieces[i][k]=k==='grain'?e.target.checked:(k==='name'?e.target.value:Number(e.target.value));
  $('partCountCaption').textContent=fmt(project.pieces.reduce((s,x)=>s+Number(x.q||0),0))+' шт.';
  changed();
 });
 $('partsBody').addEventListener('change',e=>{if(e.target.type==='checkbox')e.target.dispatchEvent(new Event('input',{bubbles:true}))});
 $('partsBody').addEventListener('click',e=>{
  const btn=e.target.closest('button[data-remove]');if(!btn)return;
  const i=Number(btn.dataset.remove);if(project.pieces.length<=1){toast('В списке должна остаться хотя бы одна деталь.');return}
  project.pieces.splice(i,1);project.pieces.forEach((r,j)=>r.id=j+1);renderRows();changed();
 });
 $('addRowBtn').onclick=()=>{
  if(project.pieces.length>=500){toast('Лимит — 500 строк.');return}
  project.pieces.push({id:project.pieces.length+1,l:500,w:300,q:1,grain:true,name:''});renderRows();changed();
 };
 $('newBtn').onclick=()=>{setProject(blankProject());status('Новый проект создан.')};
 $('exampleBtn').onclick=async()=>{try{const v=await window.listpro.example();setProject(v.project,v.result);status('Загружен проверенный контрольный раскрой 26 деталей.');toast('Пример Held-Strips загружен.')}catch(e){toast('Ошибка примера: '+e.message)}};
 $('openBtn').onclick=async()=>{try{const x=await window.listpro.open();if(x){setProject(x);status('Проект открыт. Для построения карты нажмите «Раскроить».')}}catch(e){toast('Ошибка открытия: '+e.message)}};
 $('example171Btn').onclick=async()=>{try{const v=await window.listpro.example('171');setProject(v.project,v.result);status('Заказ 171 деталь · 11 листов · 349 резов');}catch(e){toast(e.message)}};
 $('cancelBtn').onclick=async()=>{await window.listpro.cancel();};
 $('importBtn').onclick=()=>{$('importModal').hidden=false;$('importError').textContent='';$('importText').focus();};
 $('closeImport').onclick=()=>$('importModal').hidden=true;
 $('applyImport').onclick=()=>{try{
  const pieces=window.ListProTableImport.parseTable($('importText').value,$('importGrain').checked);
  project.pieces=pieces;renderRows();changed();$('importModal').hidden=true;toast('Импортировано '+pieces.length+' строк.');
 }catch(e){$('importError').textContent=e.message;}};
 $('allowTurnsBtn').onclick=()=>{project.pieces.forEach(p=>p.grain=false);renderRows();changed();toast('Поворот разрешён для всех деталей.');};
 $('calculateBtn').onclick=calculate;$('saveBtn').onclick=()=>save('project');
 $('exportJsonBtn').onclick=()=>save('result');$('exportSvgBtn').onclick=()=>save('svg');
 $('showStrips').onchange=renderMap;
 $('prevStepBtn').onclick=()=>goStep(-1);$('nextStepBtn').onclick=()=>goStep(1);
 $('stepRange').oninput=e=>{if(!result)return;selectedStep=Number(e.target.value)-1;renderSteps();renderMap()};
 $('showAllOpsBtn').onclick=()=>showView('operations');$('navOperations').onclick=()=>showView('operations');
 $('navCutting').onclick=()=>showView('cutting');$('backToCutting').onclick=()=>showView('cutting');
 $('aboutBtn').onclick=()=>$('aboutModal').hidden=false;$('closeAbout').onclick=()=>$('aboutModal').hidden=true;
 $('aboutModal').onclick=e=>{if(e.target===$('aboutModal'))$('aboutModal').hidden=true};
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){$('aboutModal').hidden=true;$('importModal').hidden=true;return}
  if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.key==='ArrowLeft')goStep(-1);if(e.key==='ArrowRight')goStep(1);
 });
 window.listpro.onProgress(({phase,completed,total,bestSheets})=>{
  status((phase||'Поиск')+' '+completed+' / '+total+' · лучший найденный результат: '+(bestSheets||'—')+' лист(ов)');
 });
}
async function boot(){
 bind();
 try{
  const saved=localStorage.getItem('listpro-project-v1');
  if(saved){setProject(JSON.parse(saved));status('Проект восстановлен. Выполните новый расчёт.')}
  else{const v=await window.listpro.example();setProject(v.project,v.result);status('Загружен контрольный пример: 26 деталей, проверенный расчёт.')}
 }catch(e){setProject(blankProject());toast('Не удалось загрузить контрольный пример: '+e.message)}
}
boot();

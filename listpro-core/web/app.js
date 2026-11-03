'use strict';
(()=>{
 const $=id=>document.getElementById(id),all=s=>Array.from(document.querySelectorAll(s)),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const EX=JSON.parse($('examples').textContent),copy=o=>JSON.parse(JSON.stringify(o)),fmt=n=>Number(n).toLocaleString('ru-RU',{maximumFractionDigits:2});
 const colors=['#bedcf8','#c6ead7','#e1d5f9','#ffe2aa','#f6cddd','#b8e7ed'];
 let project,result=null,sheet=0,step=0,zoom=1,columns=2,worker=null,busy=false,toastTimer,focusBefore;
 function toast(s){$('toast').textContent=s;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4500);}
 function tab(key){all('[data-tab]').forEach(b=>{const on=b.dataset.tab===key;b.classList.toggle('active',on);b.setAttribute('aria-selected',on);});all('[role="tabpanel"]').forEach(p=>p.hidden=p.id!=='panel-'+key);}
 function modal(id,on){if(on){focusBefore=document.activeElement;$(id).hidden=false;$(id).querySelector('button,textarea,input')?.focus();}else{$(id).hidden=true;focusBefore?.focus();}}
 function setBusy(on){busy=on;$('progress').hidden=!on;all('#calculate,#addRow,#allowAll,#importOpen,#applyImport,#chooseFile,[data-example],#partsBody input,#partsBody button,#panel-settings input,#panel-settings select').forEach(b=>b.disabled=on);}
 function status(s,valid=false){$('validation').textContent=s;$('validation').classList.toggle('passed',valid);}
 function invalidate(){result=null;sheet=0;step=0;status('Заказ изменён. Рассчитайте новую карту.');renderResult();}
 function updateCount(){const q=project.pieces.reduce((s,p)=>s+(Number(p.q)||0),0);$('orderCount').textContent=fmt(q)+' деталей · '+project.pieces.length+' строк';$('partsBadge').textContent=q;$('orderTitle').textContent=project.name;}
 function fillForm(){
  updateCount();$('projectName').value=project.name;$('materialName').value=project.material;
  for(const k of ['sheetW','sheetH','kerf','trim','objective'])$(k).value=project[k];
  $('partsBody').innerHTML=project.pieces.map((p,i)=>'<tr data-row="'+i+'"><td class="row-number">'+(i+1)+'</td><td><input data-field="name" aria-label="Название '+(i+1)+'" value="'+esc(p.name||'Деталь '+(i+1))+'"></td>'+['l','w','q'].map(k=>'<td><input data-field="'+k+'" type="number" min="'+(k==='q'?1:.1)+'" step="'+(k==='q'?1:.1)+'" aria-label="'+({l:'Длина',w:'Ширина',q:'Количество'}[k])+' '+(i+1)+'" value="'+p[k]+'"></td>').join('')+'<td><input type="checkbox" data-field="rotate" aria-label="Разрешить поворот '+(i+1)+'" '+(!p.grain?'checked':'')+'></td><td><button class="btn icon-btn" data-delete="'+i+'" aria-label="Удалить строку '+(i+1)+'">×</button></td></tr>').join('');
 }
 function request(action,payload){
  if(worker)worker.terminate();setBusy(true);$('progressText').textContent=action==='validate'?'Проверяем сохранённую карту':'Ищем допустимый раскрой';$('progressFill').style.width='5%';
  try{const url=URL.createObjectURL(new Blob([$('worker-source').textContent],{type:'text/javascript'}));worker=new Worker(url);URL.revokeObjectURL(url);}
  catch(e){setBusy(false);toast('Не удалось запустить расчёт: '+e.message);return;}
  worker.onmessage=e=>{
   const m=e.data;if(m.type==='progress'){$('progressText').textContent=m.data.text;$('progressFill').style.width=Math.min(98,m.data.percent)+'%';return;}
   worker.terminate();worker=null;setBusy(false);
   if(m.type==='error'){status('Расчёт не завершён: '+m.message);toast(m.message);return;}
   result=m.result;sheet=0;step=0;
   status('✓ Геометрия и PSS проверены · удерживаемые остатки не поворачиваются',true);renderResult();
   if(action==='solve')toast('Расчёт готов: '+result.sheets.length+' лист(а). Все операции прошли проверку.');
  };
  worker.onerror=e=>{worker?.terminate();worker=null;setBusy(false);status('Ошибка расчёта. Изменения заказа сохранены в форме.');toast(e.message||'Не удалось выполнить расчёт.');};
  worker.postMessage({action,...payload});
 }
 function example(key){if(busy)return;clearTimeout(toastTimer);$('toast').classList.remove('visible');const e=EX[key];project={...copy(e.parameters),name:e.name,material:'ЛДСП, 16 мм',objective:e.objective};result=null;fillForm();renderResult();modal('importModal',false);tab('map');request('validate',{input:project,layout:e.layout});}
 const sheetOf=o=>o.sheet??Number((o.inputBlankId||o.blankId||'').match(/^s(\d+)/)?.[1]??0);
 function operation(){return result?.plan.operations[step];}
 function mapSVG(index,active=false,thumbnail=false){
  const p=result.parameters,sh=result.sheets[index],W=p.sheetW,H=p.sheetH,margin=Math.max(W*.045,90),fs=W*.014;
  const id='hatch-'+index+'-'+(thumbnail?'grid':active?'active':'print'),op=active?operation():null;
  let out='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(-margin)+' '+(-margin)+' '+(W+margin*1.4)+' '+(H+margin*1.4)+'" role="img" aria-label="Карта раскроя, лист '+(index+1)+'" style="font-family:Segoe UI,Arial,sans-serif;background:#fff"><defs><pattern id="'+id+'" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="22" height="22" fill="#f4f6f8"/><line x1="0" y1="0" x2="0" y2="22" stroke="#dae1e9" stroke-width="3"/></pattern></defs>';
  out+='<rect width="'+W+'" height="'+H+'" fill="url(#'+id+')" stroke="#52647b" stroke-width="3"/>';
  out+='<path d="M0 -25v-22M'+W+' -25v-22M0 -36H'+W+' M-25 0h-22M-25 '+H+'h-22M-36 0V'+H+'" fill="none" stroke="#53647b" stroke-width="2"/><text x="'+W/2+'" y="-55" text-anchor="middle" font-size="'+fs+'" font-weight="600">'+fmt(W)+' мм</text><text transform="translate(-65 '+H/2+') rotate(-90)" text-anchor="middle" font-size="'+fs+'" font-weight="600">'+fmt(H)+' мм</text>';
  for(const a of sh.parts){
   const cx=a.x+a.w/2,cy=a.y+a.h/2,vertical=a.w<a.h*.65,tw=vertical?a.h:a.w,th=vertical?a.w:a.h;
   const f=Math.min(fs,tw/8,th/4),label=a.id+':'+a.instance;
   out+='<g class="piece" data-part="'+label+'" tabindex="0" role="button" aria-label="Деталь '+label+', '+a.w+' на '+a.h+' миллиметров"><title>Деталь '+label+' · '+a.w+' × '+a.h+' мм'+(a.rotated?' · повёрнута':'')+'</title><rect x="'+a.x+'" y="'+a.y+'" width="'+a.w+'" height="'+a.h+'" fill="'+colors[(a.id-1)%colors.length]+'" stroke="#66869b" stroke-width="2"/><text transform="translate('+cx+' '+cy+')'+(vertical?' rotate(-90)':'')+'" text-anchor="middle" fill="#183249" font-size="'+f+'"><tspan x="0" dy="-0.2em" font-weight="650">Деталь '+label+'</tspan><tspan x="0" dy="1.4em">'+fmt(a.w)+' × '+fmt(a.h)+'</tspan></text></g>';
  }
  const largest=sh.remnants.slice().sort((a,b)=>b.area-a.area)[0];
  if(largest&&largest.w>250&&largest.h>120)out+='<text x="'+(largest.x+largest.w/2)+'" y="'+(largest.y+largest.h/2)+'" text-anchor="middle" fill="#6a7c8e" font-size="'+Math.min(fs,largest.h/4)+'">Остаток '+fmt(largest.w)+' × '+fmt(largest.h)+'</text>';
  if(op?.materialRect){const r=op.materialRect;out+='<rect x="'+r.x+'" y="'+r.y+'" width="'+r.w+'" height="'+r.h+'" fill="none" stroke="#0b9061" stroke-width="5" stroke-dasharray="18 10"/>';
   if(op.type==='cut'){const v=op.materialAxis==='V';out+='<rect x="'+(v?op.materialPos:r.x)+'" y="'+(v?r.y:op.materialPos)+'" width="'+(v?p.kerf:r.w)+'" height="'+(v?r.h:p.kerf)+'" fill="#e24a36"/><line x1="'+(v?op.materialPos:r.x)+'" y1="'+(v?r.y:op.materialPos)+'" x2="'+(v?op.materialPos:r.x+r.w)+'" y2="'+(v?r.y+r.h:op.materialPos)+'" stroke="#dc3e2b" stroke-width="5"/>';}
  }
  return thumbnail?(out+'</svg>').replace(/ tabindex="0" role="button"/g,''):out+'</svg>';
 }
 function physicalSVG(op){
  if(!op?.materialRect)return '';
  const r=op.materialRect,q=((op.type==='rotate'?op.fromOrientation:op.machineOrientation)||0)/90,odd=q%2,W=odd?r.h:r.w,H=odd?r.w:r.h;
  let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-25 -25 '+(W+50)+' '+(H+50)+'" aria-label="Текущая физическая заготовка"><rect width="'+W+'" height="'+H+'" fill="#edf2f5" stroke="#537384" stroke-width="3"/>';
  for(const a of result.sheets[sheet].parts.filter(a=>a.x>=r.x-.001&&a.y>=r.y-.001&&a.x+a.w<=r.x+r.w+.001&&a.y+a.h<=r.y+r.h+.001)){
   const x=a.x-r.x,y=a.y-r.y,w=a.w,h=a.h;
   const t=[[x,y,w,h],[r.h-y-h,x,h,w],[r.w-x-w,r.h-y-h,w,h],[y,r.w-x-w,h,w]][q];
   s+='<rect x="'+t[0]+'" y="'+t[1]+'" width="'+t[2]+'" height="'+t[3]+'" fill="'+colors[(a.id-1)%6]+'" stroke="#7c97aa" stroke-width="2"/><text x="'+(t[0]+t[2]/2)+'" y="'+(t[1]+t[3]/2)+'" text-anchor="middle" font-size="'+Math.min(34,t[2]/5,t[3]/3)+'">'+a.id+':'+a.instance+'</text>';
  }
  if(op.type==='cut')s+='<line x1="'+op.start.x+'" y1="'+op.start.y+'" x2="'+op.end.x+'" y2="'+op.end.y+'" stroke="#e24a36" stroke-width="'+Math.max(4,op.kerf)+'"/>';
  return s+'</svg>';
 }
 const typeName=o=>({load:'Загрузка листа',feed:o.feedMode==='advance-in-place'?'Продвижение остатка':'Установка полосы',cut:(o.edgeFinish?'Торцовка №':'Пропил №')+o.cutIndex,rotate:'Поворот на 90°',endPrimary:'Первичные полосы отделены'}[o.type]||o.type);
 function draw(){
  const gallery=!!result&&columns>1;
  $('sheetGallery').hidden=!gallery;$('drawing').hidden=gallery;$('sheetTabs').hidden=gallery;$('sheetReplay').hidden=!result||gallery;
  $('prevSheet').hidden=gallery;$('nextSheet').hidden=gallery;
  for(const [id,n]of [['viewSingle',1],['viewTwo',2],['viewThree',3]])$(id).setAttribute('aria-pressed',String(columns===n));
  for(const id of ['zoomIn','zoomOut','fit'])$(id).disabled=!result||gallery;
  $('partHint').textContent=gallery?'Нажмите на лист, чтобы открыть крупную карту и шаги распила':'Нажмите на деталь, чтобы узнать размеры';
  $('drawing').classList.toggle('empty',!result);
  if(!result){$('sheetGallery').innerHTML='';$('drawing').innerHTML='<div class="empty-state"><strong>Карта появится после расчёта</strong><p>Загрузите детали или выберите пример.</p></div>';$('physicalDrawing').innerHTML='';$('opDetails').textContent='';$('opLabel').textContent='Последовательность ещё не рассчитана';return;}
  const sh=result.sheets[sheet],p=result.parameters,op=operation();
  if(gallery){
   $('sheetGallery').setAttribute('data-columns',String(columns));
   $('sheetGallery').innerHTML=result.sheets.map((sh,i)=>{
    const usage=fmt(100*sh.parts.reduce((n,a)=>n+a.w*a.h,0)/(p.sheetW*p.sheetH));
    return '<button class="sheet-card" data-open-sheet="'+i+'" aria-label="Открыть лист '+(i+1)+' крупно"><span class="sheet-card-header"><strong>Лист '+(i+1)+'</strong><span>'+sh.parts.length+' дет. · '+usage+'%</span></span>'+mapSVG(i,false,true)+'<span class="sheet-card-footer">'+fmt(p.sheetW)+' × '+fmt(p.sheetH)+' мм<span>Открыть лист</span></span></button>';
   }).join('');
  }
  $('drawing').innerHTML=mapSVG(sheet,true);const picture=$('drawing').firstElementChild;picture.style.width=zoom===1?(document.fullscreenElement?'100%':'min(100%, 780px)'):(zoom*100)+'%';picture.style.maxHeight=zoom===1?(document.fullscreenElement?'78vh':'min(52vh, 520px)'):'none';
  $('sheetLabel').textContent=gallery?'Все листы · '+result.sheets.length:'Лист '+(sheet+1)+' из '+result.sheets.length;$('prevSheet').disabled=sheet===0;$('nextSheet').disabled=sheet===result.sheets.length-1;
  $('materialBadge').textContent=project.material;$('sizeBadge').textContent=fmt(p.sheetW)+' × '+fmt(p.sheetH)+' мм';
  $('usageBadge').textContent='Использование: '+fmt(100*(gallery?result.sheets.flatMap(s=>s.parts):sh.parts).reduce((n,a)=>n+a.w*a.h,0)/(p.sheetW*p.sheetH*(gallery?result.sheets.length:1)))+'%';
  $('sheetTabs').innerHTML=result.sheets.map((s,i)=>'<button class="sheet-chip '+(i===sheet?'active':'')+'" data-sheet="'+i+'">Лист '+(i+1)+' <span>'+s.parts.length+' дет.</span></button>').join('');
  $('opRange').max=result.plan.operations.length-1;$('opRange').value=step;
  $('opLabel').textContent='Шаг '+op.step+' / '+result.plan.operations.length+' · '+typeName(op);
  $('prevOp').disabled=step===0;$('nextOp').disabled=step===result.plan.operations.length-1;
  $('physicalDrawing').innerHTML=physicalSVG(op);
  const frame=result.verification.roleFrames.find(f=>f.step===op.step);
  $('opDetails').innerHTML='<strong>'+esc(typeName(op))+'</strong><p>'+esc(op.inputBlankId||op.blankId||'')+'</p>'+(op.materialRect?'<p>Заготовка: '+fmt(op.type==='rotate'?op.beforeSize.w:op.w)+' × '+fmt(op.type==='rotate'?op.beforeSize.h:op.h)+' мм<br>Ориентация: '+(op.fromOrientation??op.machineOrientation??0)+'°'+(op.type==='rotate'?' → '+op.toOrientation+'°':'')+'</p>':'')+(op.type==='cut'?'<p>Ось '+op.axis+' · позиция '+fmt(op.axis==='V'?op.start.x:op.start.y)+' мм · пропил '+op.kerf+' мм</p>':'')+(op.edgeFinish?'<p>Торцовка края: часть ширины диска проходит вне заготовки. Размер детали сохранён.</p>':'')+(frame?'<p>'+frame.outputs.map(c=>esc(c.id)+'<br>'+fmt(op.machineOrientation%180?c.rect.h:c.rect.w)+' × '+fmt(op.machineOrientation%180?c.rect.w:c.rect.h)+' мм в станке · '+(op.edgeFinish?'готовая деталь':c.role==='TRIM'?'обрезок':c.held?'удерживается: только дальнейший распуск':'отделена: допускается один поворот')).join('<br><br>')+'</p>':'');
 }
 function renderResult(){
  const has=!!result;['print','export','prevSheet','nextSheet','prevOp','nextOp','opRange','exportOps','zoomIn','zoomOut','fit'].forEach(id=>$(id).disabled=!has);
  if(!has){['statSheets','statParts','statCuts','statRemnant','sheetLabel','usageBadge'].forEach(id=>$(id).textContent='—');$('sheetTabs').innerHTML='';$('remnantsBody').innerHTML='';$('operationsBody').innerHTML='';$('remnantTotal').textContent='Нет рассчитанной карты';draw();return;}
  const m=result.metrics;$('statSheets').textContent=m.sheets;$('statParts').textContent=result.partCount;$('statCuts').textContent=m.cuts+' / '+m.turns;$('statRemnant').textContent=fmt(m.largestWaste/1e6)+' м²';
  const remnants=result.sheets.flatMap((s,i)=>s.remnants.map(r=>({...r,sheet:i}))).sort((a,b)=>b.area-a.area);
  $('remnantTotal').textContent=remnants.length+' участков · крупнейший '+(remnants[0]?fmt(remnants[0].w)+' × '+fmt(remnants[0].h)+' мм':'—');
  $('remnantsBody').innerHTML=remnants.map(r=>'<tr><td>'+(r.sheet+1)+'</td><td>'+fmt(r.w)+' × '+fmt(r.h)+'</td><td>'+fmt(r.area/1e6)+' м²</td><td>'+fmt(r.x)+'</td><td>'+fmt(r.y)+'</td></tr>').join('');
  $('operationsBody').innerHTML=result.plan.operations.map((o,i)=>'<tr data-step="'+i+'" tabindex="0"><td>'+o.step+'</td><td>'+(sheetOf(o)+1)+'</td><td>'+esc(typeName(o))+'</td><td>'+esc(o.inputBlankId||o.blankId||'—')+'</td><td>'+(o.w?fmt(o.w)+' × '+fmt(o.h):'—')+'</td><td>'+(o.fromOrientation??o.machineOrientation??0)+'°</td><td>'+esc(o.axis||'—')+'</td><td>'+(o.type==='cut'?fmt(o.axis==='V'?o.start.x:o.start.y):'—')+'</td></tr>').join('');
  draw();
 }
 function gotoStep(n){if(!result)return;columns=1;step=Math.max(0,Math.min(n,result.plan.operations.length-1));sheet=sheetOf(operation());draw();}
 function gotoSheet(n){if(!result)return;sheet=Math.max(0,Math.min(n,result.sheets.length-1));step=result.plan.operations.findIndex(o=>o.type==='load'&&o.sheet===sheet);draw();}
 function download(name,text,type){const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 function json(name,data){download(name,JSON.stringify(data,null,2),'application/json;charset=utf-8');}
 function csv(name,rows){const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';download(name,'\ufeff'+rows.map(r=>r.map(quote).join(';')).join('\r\n'),'text/csv;charset=utf-8');}
 function applyPieces(p){project.pieces=p;invalidate();fillForm();modal('importModal',false);tab('parts');toast('Детали загружены. Нажмите «Рассчитать».');}
 all('[data-tab]').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
 all('[data-example]').forEach(b=>b.onclick=()=>example(b.dataset.example));
 all('[data-close]').forEach(b=>b.onclick=()=>modal(b.dataset.close,false));
 all('.modal-backdrop').forEach(b=>b.onclick=e=>{if(e.target===b)modal(b.id,false);});
 document.addEventListener('keydown',e=>{
  const m=all('.modal-backdrop').find(x=>!x.hidden);if(!m)return;
  if(e.key==='Escape')modal(m.id,false);
  if(e.key==='Tab'){const list=Array.from(m.querySelectorAll('button,input,textarea,select,a')).filter(x=>!x.disabled&&x.offsetParent!==null),first=list[0],last=list.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 });
 $('importOpen').onclick=()=>modal('importModal',true);
 $('calculate').onclick=()=>{if(busy)return;tab('map');request('solve',{input:project,options:{objective:project.objective,iterations:100,seed:42,examples:Object.values(EX)}});};
 $('cancel').onclick=()=>{worker?.terminate();worker=null;setBusy(false);toast('Расчёт остановлен.');if(!result)status('Расчёт остановлен. Нажмите «Рассчитать», чтобы повторить.');};
 $('partsBody').addEventListener('input',e=>{const tr=e.target.closest('[data-row]'),k=e.target.dataset.field;if(!tr||!k)return;const p=project.pieces[Number(tr.dataset.row)];if(k==='rotate')p.grain=!e.target.checked;else p[k]=k==='name'?e.target.value:Number(e.target.value);invalidate();updateCount();});
 $('partsBody').onclick=e=>{const b=e.target.closest('[data-delete]');if(!b)return;project.pieces.splice(Number(b.dataset.delete),1);project.pieces.forEach((p,i)=>p.id=i+1);invalidate();fillForm();};
 $('addRow').onclick=()=>{if(project.pieces.length>=500){toast('Не более 500 строк.');return;}project.pieces.push({id:project.pieces.length+1,name:'',l:500,w:300,q:1,grain:false});invalidate();fillForm();};
 $('allowAll').onclick=()=>{project.pieces.forEach(p=>p.grain=false);invalidate();fillForm();};
 for(const k of ['sheetW','sheetH','kerf','trim','objective'])$(k).onchange=()=>{project[k]=k==='objective'?$(k).value:Number($(k).value);invalidate();};
 $('projectName').oninput=()=>{project.name=$('projectName').value;updateCount();};$('materialName').oninput=()=>{project.material=$('materialName').value;if(result)draw();};
 $('applyImport').onclick=()=>{try{applyPieces(ListProTableImport.parseTable($('importText').value,!$('importRotate').checked));$('importError').textContent='';}catch(e){$('importError').textContent=e.message;}};
 $('chooseFile').onclick=()=>$('fileInput').click();
 $('fileInput').onchange=async()=>{
  const f=$('fileInput').files[0];if(!f)return;try{
   if(f.size>5e6)throw Error('Файл больше 5 МБ.');const text=await f.text();
   if(f.name.toLowerCase().endsWith('.json')){const o=JSON.parse(text),p=o.project||o.parameters||o;
    if(!Array.isArray(p.pieces)||p.pieces.length>500)throw Error('В JSON нужен список pieces (до 500 строк).');
    const pieces=p.pieces.map((a,i)=>({id:i+1,name:String(a.name||''),l:Number(a.l),w:Number(a.w),q:Number(a.q),grain:a.grain!==false}));
    if(pieces.some(a=>!Number.isFinite(a.l)||a.l<=0||!Number.isFinite(a.w)||a.w<=0||!Number.isSafeInteger(a.q)||a.q<=0)||pieces.reduce((s,a)=>s+a.q,0)>2500)throw Error('Некорректные размеры или количества.');
    for(const k of ['sheetW','sheetH','kerf','trim'])if(p[k]!==undefined){if(!Number.isFinite(Number(p[k])))throw Error('Некорректный параметр '+k);}
    for(const k of ['sheetW','sheetH','kerf','trim'])if(p[k]!==undefined)project[k]=Number(p[k]);
    if(typeof p.name==='string')project.name=p.name;if(typeof p.material==='string')project.material=p.material;if(['cuts','remnants'].includes(p.objective))project.objective=p.objective;
    applyPieces(pieces);
   }else{$('importText').value=text;$('importError').textContent='Таблица прочитана. Проверьте данные и нажмите «Заменить список».';}
  }catch(e){$('importError').textContent=e.message;}finally{$('fileInput').value='';}
 };
 $('save').onclick=()=>{json('listpro-project.json',{format:'listpro-web-project-v1',project});toast('Файл проекта сохранён. Его можно открыть через загрузку JSON.');};
 $('export').onclick=()=>{if(result)modal('exportModal',true);};
 $('downloadSvg').onclick=()=>{if(result)download('listpro-sheet-'+(sheet+1)+'.svg',mapSVG(sheet),'image/svg+xml;charset=utf-8');};
 $('downloadJson').onclick=()=>{if(result)json('listpro-result.json',result);};
 $('downloadCsv').onclick=()=>{if(result)csv('listpro-parts.csv',[['Лист','Деталь','Экземпляр','X','Y','Ширина','Высота','Поворот'],...result.sheets.flatMap((s,i)=>s.parts.map(a=>[i+1,a.id,a.instance,a.x,a.y,a.w,a.h,a.rotated?'Да':'Нет']))]);};
 $('exportOps').onclick=()=>{if(result)csv('listpro-operations.csv',[['Шаг','Лист','Операция','Заготовка','Ширина','Высота','Ось','Позиция'],...result.plan.operations.map(o=>[o.step,sheetOf(o)+1,typeName(o),o.inputBlankId||o.blankId,o.w,o.h,o.axis,o.type==='cut'?(o.axis==='V'?o.start.x:o.start.y):''])]);};
 $('print').onclick=()=>{if(!result)return;$('printPages').innerHTML=result.sheets.map((s,i)=>'<section class="print-page"><h2>'+esc(project.name)+' · лист '+(i+1)+'</h2>'+mapSVG(i)+'<p>Пропил '+result.parameters.kerf+' мм · обрезка '+result.parameters.trim+' мм · '+s.parts.length+' деталей. PSS проверен. Совместимость со станком не подтверждена.</p></section>').join('');window.print();};
 for(const [id,n]of [['viewSingle',1],['viewTwo',2],['viewThree',3]])$(id).onclick=()=>{columns=n;zoom=1;draw();};
 $('sheetGallery').onclick=e=>{const card=e.target.closest('[data-open-sheet]');if(!card||!result)return;columns=1;zoom=1;gotoSheet(Number(card.dataset.openSheet));$('panel-map').scrollIntoView({block:'start',behavior:'smooth'});$('viewSingle').focus();};
 $('prevSheet').onclick=()=>gotoSheet(sheet-1);$('nextSheet').onclick=()=>gotoSheet(sheet+1);
 $('sheetTabs').onclick=e=>{const b=e.target.closest('[data-sheet]');if(b)gotoSheet(Number(b.dataset.sheet));};
 $('prevOp').onclick=()=>gotoStep(step-1);$('nextOp').onclick=()=>gotoStep(step+1);$('opRange').oninput=()=>gotoStep(Number($('opRange').value));
 function pickOp(e){const row=e.target.closest('[data-step]');if(row){gotoStep(Number(row.dataset.step));tab('map');$('drawing').scrollIntoView({block:'center',behavior:'smooth'});}}
 $('operationsBody').onclick=pickOp;$('operationsBody').onkeydown=e=>{if(e.key==='Enter')pickOp(e);};
 function pickPart(e){const g=e.target.closest('[data-part]');if(!g)return;all('#drawing [data-part] rect').forEach(r=>r.setAttribute('stroke-width','2'));g.querySelector('rect').setAttribute('stroke-width','8');const a=result.sheets[sheet].parts.find(a=>a.id+':'+a.instance===g.dataset.part);$('partHint').textContent='Деталь '+g.dataset.part+' · '+fmt(a.w)+' × '+fmt(a.h)+' мм · X '+fmt(a.x)+', Y '+fmt(a.y)+(a.rotated?' · повёрнута относительно исходных размеров':'');}
 $('drawing').onclick=pickPart;$('drawing').onkeydown=e=>{if(e.key==='Enter'||e.key===' ')pickPart(e);};
 document.addEventListener('fullscreenchange',draw);
 $('zoomIn').onclick=()=>{zoom=Math.min(3,zoom+.25);draw();};$('zoomOut').onclick=()=>{zoom=Math.max(1,zoom-.25);draw();};$('fit').onclick=()=>{zoom=1;draw();};
 $('full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('workspace').requestFullscreen();}catch{toast('Полноэкранный режим недоступен в этом браузере.');}};
 example('44');
})();
'use strict';
const fs=require('node:fs'),path=require('node:path'),base=path.resolve(__dirname,'../..');
function build(){let app=fs.readFileSync(path.join(base,'web/app.js'),'utf8'),html=fs.readFileSync(path.join(base,'web/template.html'),'utf8'),css=fs.readFileSync(path.join(base,'web/styles.css'),'utf8');
 function replace(a,b){if(!app.includes(a))throw Error('Server adapter needs update: '+a.slice(0,50));app=app.replace(a,b);}
 const start=app.indexOf(' function request('),end=app.indexOf(' const sheetOf=',start);if(start<0||end<0)throw Error('Request adapter missing');
 app=app.slice(0,start)+` let requestSerial=0;
 async function api(url,options={}){const response=await fetch(url,{credentials:'same-origin',...options});const data=await response.json();if(!response.ok)throw Error(data.error||'Ошибка сервера');return data;}
 async function request(action,payload){const serial=++requestSerial;let id=null,cancelled=false;setBusy(true);$('progressText').textContent='Отправляем заказ на сервер';
  const stop=()=>{cancelled=true;requestSerial++;if(id)api('/api/jobs/'+id,{method:'DELETE'}).catch(()=>{});};worker={terminate:stop};
  try{const created=await api('/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload.input)});id=created.id;if(cancelled){await api('/api/jobs/'+id,{method:'DELETE'});return;}
   while(serial===requestSerial){const state=await api('/api/jobs/'+id);if(state.progress){$('progressText').textContent=state.progress.text;$('progressFill').style.width=Math.min(98,state.progress.percent)+'%';}
    if(state.status==='done'){result=state.result;syncEdges();sheet=0;step=0;status('Геометрия и полосная модель проверены. Совместимость со станком требует его параметров.',true);renderResult();return;}
    if(['failed','cancelled'].includes(state.status))throw Error(state.error||'Расчёт остановлен');await new Promise(resolve=>setTimeout(resolve,700));}
  }catch(e){if(serial===requestSerial){status(e.message);toast(e.message);}}finally{if(serial===requestSerial){worker=null;setBusy(false);}}
 }
`+app.slice(end);
 replace("$('materialBadge').textContent=project.material;", "$('materialBadge').textContent=project.material+' · '+fmt(project.thickness)+' мм';");
 replace("$('materialName').value=project.material;", "$('materialName').value=project.material;$('materialThickness').value=project.thickness;");
 replace("l:500,w:300,q:1", "l:'',w:'',q:1");
 replace(" $('save').onclick=", " $('materialThickness').oninput=()=>{project.thickness=Number($('materialThickness').value);if(result)draw();};\n $('save').onclick=");
 replace("if(typeof p.name==='string')", "if(p.thickness!==undefined)project.thickness=Number(p.thickness);if(typeof p.name==='string')");
 replace(" example('44');", " project={name:'Новый заказ',material:'Листовой материал',thickness:16,sheetW:2750,sheetH:1830,kerf:5,trim:10,objective:'remnants',partOrder:'descending',pieces:[]};fillForm();renderResult();tab('parts');");
 html=html.replace(/<button\b[^>]*data-example="[^"]+"[\s\S]*?<\/button>/g,'').replace(/<header\b[\s\S]*?<\/header>/,'').replace(/<section class="hero"[\s\S]*?<\/section>/,'');
 const a=html.indexOf('<section class="feature-wrap"'),b=html.indexOf('<div id="importModal"');if(a>=0&&b>a)html=html.slice(0,a)+html.slice(b);
 html=html.replace('<body>','<body><div class="server-banner"><strong>ЛистПро</strong><span>Расчёт и база опыта на сервере</span></div>');
 html=html.replace('<label>Длина листа, мм','<label>Толщина материала, мм<input id="materialThickness" type="number" min="0.1" max="1000" step="0.1"></label><label>Длина листа, мм');
 html=html.replace(/<div class="note"><b>Многостадийный полосный раскрой\.[\s\S]*?<\/div>/,'<div class="note">Проверяется геометрия и полосная последовательность. Технология резки выбранного материала и параметры реального оборудования проверяются отдельно. Для стекла не моделируется надлом. Минимальный пропил — 0,1 мм.</div>');
 html=html.replace('Загрузите детали или выберите пример.','Добавьте детали или загрузите свой список.').replace('placeholder="500&#9;300&#9;44"','placeholder="Длина; ширина; количество"');
 css+='\n.server-banner{display:flex;gap:20px;padding:14px 24px;background:#e3f4eb;color:#164c37}.server-banner span{font-size:12px}\n';
 const safe=s=>s.replace(/<\/script/gi,'<\\/script'),values={__CSS__:css,__APP__:safe(app),__EXAMPLES__:'{}',__WORKER__:'',__IMPORT__:safe(fs.readFileSync(path.join(base,'desktop/table-import.js'),'utf8')+'\n'+fs.readFileSync(path.join(base,'web/edge-banding.js'),'utf8'))};
 html=html.replace(/__(?:CSS|APP|EXAMPLES|WORKER|IMPORT)__/g,k=>values[k]);const out=path.join(base,'server/dist');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);return {html,app};
}
if(require.main===module)console.log('Built server UI:',Buffer.byteLength(build().html),'bytes');module.exports={build};

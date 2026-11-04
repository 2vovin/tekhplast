'use strict';
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'../..');
function build(){
 let app=fs.readFileSync(path.join(base,'web/app.js'),'utf8'),html=fs.readFileSync(path.join(base,'web/template.html'),'utf8'),css=fs.readFileSync(path.join(base,'web/styles.css'),'utf8');
 const replace=(from,to)=>{if(!app.includes(from))throw Error('Demo UI adapter needs update: '+from.slice(0,70));app=app.replace(from,to);};
 function section(start,end,value){const a=app.indexOf(start),b=app.indexOf(end,a);if(a<0||b<0)throw Error('Missing UI section');app=app.slice(0,a)+value+app.slice(b);}
 section(' function request(', ' const sheetOf=', ` let requestSerial=0;
 window.listproDemo.onProgress(data=>{$('progressText').textContent=data.text;$('progressFill').style.width=Math.min(98,data.percent)+'%';});
 async function request(action,payload){
  const serial=++requestSerial;setBusy(true);$('progressText').textContent='Расчёт нового заказа';
  worker={terminate:()=>{requestSerial++;window.listproDemo.cancel();}};
  try{const next=await window.listproDemo.calculate(payload.input);if(serial!==requestSerial)return;result=next;syncEdges();sheet=0;step=0;status('Геометрия и полосная модель проверены. Технология выбранного материала требует отдельной проверки.',true);renderResult();}
  catch(e){if(serial===requestSerial){status(e.message);toast(e.message);}}
  finally{if(serial===requestSerial){worker=null;setBusy(false);}}
 }
`);
 section(' function download(', ' function applyPieces(', ` function download(){toast('Экспорт недоступен в демоверсии.');}
 function json(){download();}function csv(){download();}
`);
 section(' function preparePrint(){', ' for(const [id,n]of', ` function preparePrint(){$('printPages').textContent='Печать недоступна в демоверсии.';}
 window.onbeforeprint=preparePrint;window.print=()=>toast('Печать недоступна в демоверсии.');
 $('print').onclick=window.print;
`);
 replace(" function mapSVG(index,active=false,thumbnail=false){",` function lockedSVG(index){
  const sh=result.sheets[index],H=1000*result.parameters.sheetH/result.parameters.sheetW;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 '+H+'" role="img" aria-label="Демопревью листа '+(index+1)+' без размеров"><defs><filter id="demo-blur-'+index+'"><feGaussianBlur stdDeviation="3"/></filter></defs><rect width="1000" height="'+H+'" fill="#eef2f5"/><g class="demo-blurred" filter="url(#demo-blur-'+index+')">'+sh.preview.map((a,i)=>'<rect x="'+a.x+'" y="'+a.y*H/1000+'" width="'+a.w+'" height="'+a.h*H/1000+'" fill="'+colors[i%colors.length]+'" stroke="#8da1b1"/>').join('')+'</g></svg>';
 }
 function mapSVG(index,active=false,thumbnail=false){if(result.sheets[index].locked)return lockedSVG(index);`);
 replace(" function sheetList(index,rows=sheetRows(index)){", " function sheetList(index,rows=sheetRows(index)){if(result.sheets[index].locked)return '<aside class=\"compact-parts demo-locked-note\">Демо: номера и размеры доступны только на первых двух листах.</aside>';");
 replace(" function renderSheetParts(){", " function renderSheetParts(){if(result.sheets[sheet].locked){$('sheetPartsTitle').textContent='Демопревью';$('sheetPartsCount').textContent='Лист '+(sheet+1);$('sheetPartsBody').innerHTML='<tr><td colspan=\"3\">Номера и размеры скрыты</td></tr>';return;}");
 app=app.replaceAll('sh.parts.length', '(sh.partCount??sh.parts.length)').replaceAll('s.parts.length','(s.partCount??s.parts.length)');
 replace("' дет. · '+usage+'%","' дет. · '+(sh.locked?'Демо':usage+'%')+'");
 replace("const usage=fmt(100*", "const usage=sh.locked?'—':fmt(100*");
 replace("$('usageBadge').textContent='Использование: '", "$('usageBadge').textContent=gallery?'Использование: '+fmt(result.usagePercent)+'%':sh.locked?'Демопревью':'Использование: '");
 replace("$('materialBadge').textContent=project.material;", "$('materialBadge').textContent=project.material+' · '+fmt(project.thickness)+' мм';");
 replace("$('materialName').value=project.material;", "$('materialName').value=project.material;$('materialThickness').value=project.thickness;");
 replace("l:500,w:300,q:1", "l:'',w:'',q:1");
 replace(" $('save').onclick=", " $('materialThickness').oninput=()=>{project.thickness=Number($('materialThickness').value);if(result)draw();};\n $('save').onclick=");
 // Explicitly disable unavailable controls after every refresh, including worker completion.
 replace(" function draw(){", ` function draw(){
  for(const id of ['save','print','export','exportOps','downloadSvg','downloadJson','downloadCsv']){$(id).disabled=true;$(id).title='Недоступно в демоверсии';}
`);
 replace(" example('44');", " project={name:'Новый заказ',material:'Листовой материал',thickness:16,sheetW:2750,sheetH:1830,kerf:5,trim:10,objective:'remnants',partOrder:'descending',pieces:[]};fillForm();renderResult();tab('parts');");
 // Private examples and old layouts are absent, even in the generated source.
 html=html.replace(/<button\b[^>]*data-example="[^"]+"[\s\S]*?<\/button>/g,'');
 html=html.replace(/<header\b[\s\S]*?<\/header>/,'').replace(/<section class="hero"[\s\S]*?<\/section>/,'');
 const a=html.indexOf('<section class="feature-wrap"'),b=html.indexOf('<div id="importModal"');if(a>=0&&b>a)html=html.slice(0,a)+html.slice(b);
 html=html.replace('<body>','<body><div class="demo-banner"><strong>ЛистПро · Демо для Windows</strong><span>Первые 2 листа — с номерами и размерами. Остальные — размытое превью. Печать и экспорт недоступны.</span></div>');
 html=html.replace('<head>','<head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; connect-src \'none\'">');
 html=html.replace('<label>Длина листа, мм', '<label>Толщина материала, мм<input id="materialThickness" type="number" min="0.1" max="1000" step="0.1"></label><label>Длина листа, мм');
 html=html.replace('<input id="materialName" value="Листовой материал" maxlength="60">','<input id="materialName" value="Листовой материал" maxlength="60" list="materials"><datalist id="materials"><option value="ЛДСП"><option value="МДФ"><option value="Фанера"><option value="Стекло"><option value="Пластик"><option value="Металл"></datalist>');
 html=html.replace(/<div class="note"><b>Многостадийный полосный раскрой\.[\s\S]*?<\/div>/,'<div class="note">Геометрический расчёт прямоугольных деталей по полосной модели. Толщина и название материала описывают заказ. Способ резки, допустимые операции и параметры оборудования проверяются отдельно. Для стекла программа не формирует технологию надлома. Минимальный пропил в текущей модели — 0,1 мм.</div>');
 html=html.replace('Загрузите детали или выберите пример.','Добавьте детали или загрузите свой список.').replace('placeholder="500&#9;300&#9;44"','placeholder="Длина; ширина; количество"');
 css+=`\n.topbar,.hero,.feature-wrap,.pricing-wrap,.site-footer,[data-tab="operations"],[data-tab="remnants"],#sheetReplay,#panel-operations,#panel-remnants,#exportModal{display:none!important}.work-section{padding-top:16px}.demo-banner{display:flex;gap:20px;align-items:center;padding:15px 24px;background:#e3f4eb;color:#164c37}.demo-banner span{font-size:12px}.demo-locked-note{font-size:11px;line-height:1.5;padding:8px}.demo-blurred{pointer-events:none}@media print{body>*{display:none!important}#printPages{display:block!important}#printPages:after{content:'Печать недоступна в демоверсии.'}}\n`;
 const safe=s=>s.replace(/<\/script/gi,'<\\/script');
 const replacements={__CSS__:css,__APP__:safe(app),__EXAMPLES__:'{}',__WORKER__:'',__IMPORT__:safe(fs.readFileSync(path.join(base,'desktop/table-import.js'),'utf8')+'\n'+fs.readFileSync(path.join(base,'web/edge-banding.js'),'utf8'))};
 html=html.replace(/__(?:CSS|APP|EXAMPLES|WORKER|IMPORT)__/g,k=>replacements[k]);
 const modules=require('../../web/build.cjs').build().modules;
 for(const id of modules){const dest=path.join(base,'desktop-demo/core',id);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(base,id),dest);}
 const out=path.join(base,'desktop-demo/renderer');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);return {html,app};
}
if(require.main===module){const {html}=build();console.log('Demo UI built, bytes:',Buffer.byteLength(html));}module.exports={build};

'use strict';
const {app,BrowserWindow,ipcMain,dialog}=require('electron');
const {Worker}=require('node:worker_threads');
const fs=require('node:fs/promises');
const path=require('node:path');

const coreBase=app.isPackaged?path.join(process.resourcesPath,'listpro-core'):path.resolve(__dirname,'..');
process.env.LISTPRO_CORE_DIR=path.join(coreBase,'src');
process.env.LISTPRO_CORE_RESOURCES=path.join(coreBase,'benchmarks');
const {cleanProject,loadExample,projectFromFile}=require('./engine.cjs');
let mainWindow=null,busy=false,activeWorker=null;
const smokeReport=process.argv.find(a=>a.startsWith('--smoke-report='))?.slice('--smoke-report='.length);
if(smokeReport){app.setPath('userData',path.join(require('node:os').tmpdir(),'listpro-smoke-'+process.pid));app.disableHardwareAcceleration();}

function createWindow(){
 mainWindow=new BrowserWindow({
  width:1510,height:930,minWidth:1030,minHeight:690,
  show:false,backgroundColor:'#f4f7fb',title:'ЛистПро Мебель',
  autoHideMenuBar:true,
  webPreferences:{
   preload:path.join(__dirname,'preload.cjs'),
   contextIsolation:true,nodeIntegration:false,sandbox:true,
   webSecurity:true
  }
 });
 mainWindow.loadFile(path.join(__dirname,'index.html'));
 mainWindow.once('ready-to-show',()=>mainWindow.show());
 mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 mainWindow.webContents.on('will-navigate',(event)=>event.preventDefault());
}
function searchInWorker(project){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(path.join(__dirname,'worker.cjs'),{
   workerData:project,
   env:{...process.env}
  });
  activeWorker=worker;let settled=false,cancelled=false;
  worker.cancel=()=>{cancelled=true;worker.terminate();};
  const clear=()=>{if(activeWorker===worker)activeWorker=null;};
  worker.on('message',message=>{
   if(message.kind==='progress'){if(!mainWindow?.isDestroyed())mainWindow.webContents.send('listpro:progress',message.data);return;}
   if(settled)return;settled=true;clear();
   if(message.kind==='result')resolve(message.data);
   else reject(new Error(message.error||'Ошибка оптимизации'));
  });
  worker.on('error',e=>{clear();if(!settled){settled=true;reject(e)}});
  worker.on('exit',code=>{clear();if(!settled){settled=true;reject(new Error(cancelled?'Расчёт отменён.':'Расчёт завершился с кодом '+code))}});
 });
}
app.whenReady().then(()=>{
 createWindow();
 ipcMain.handle('listpro:example',(_event,name)=>loadExample(name));
 ipcMain.handle('listpro:cancel',()=>{activeWorker?.cancel();return true;});
 ipcMain.handle('listpro:calculate',async(_event,input)=>{
  if(busy)throw Error('Расчёт уже выполняется.');
  busy=true;
  try{return await searchInWorker(cleanProject(input))}
  finally{busy=false}
 });
 ipcMain.handle('listpro:open',async()=>{
  const x=await dialog.showOpenDialog(mainWindow,{title:'Открыть проект',properties:['openFile'],filters:[{name:'Проект ЛистПро JSON',extensions:['json']}]});
  if(x.canceled||!x.filePaths.length)return null;
  const stat=await fs.stat(x.filePaths[0]);if(stat.size>5*1024*1024)throw Error('Слишком большой файл проекта.');
  const j=JSON.parse(await fs.readFile(x.filePaths[0],'utf8'));
  return projectFromFile(j);
 });
 ipcMain.handle('listpro:save',async(_event,format,content)=>{
  if(!['project','result','svg'].includes(format))throw Error('Недопустимый формат');
  if(typeof content!=='string'||content.length>15*1024*1024)throw Error('Файл слишком большой');
  const ext=format==='svg'?'svg':'json';
  const f=await dialog.showSaveDialog(mainWindow,{
   title:format==='project'?'Сохранить проект':format==='svg'?'Сохранить карту':'Сохранить результат',
   defaultPath:format==='project'?'listpro-project.json':format==='svg'?'listpro-cutting.svg':'listpro-result.json',
   filters:[{name:ext.toUpperCase(),extensions:[ext]}]
  });
  if(f.canceled||!f.filePath)return false;
  await fs.writeFile(f.filePath,content,'utf8');
  return true;
 });
 if(smokeReport)mainWindow.webContents.once('did-finish-load',()=>smoke().catch(async e=>{await fs.writeFile(smokeReport,JSON.stringify({ok:false,error:e.stack}));app.exit(1);}));
 app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
});
app.on('before-quit',()=>activeWorker?.cancel());
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});

async function smoke(){
 const run=code=>mainWindow.webContents.executeJavaScript(code);
 async function until(code,ms=30000){
  const end=Date.now()+ms;
  while(Date.now()<end){if(await run(code))return;await new Promise(r=>setTimeout(r,250));}
  throw Error('GUI timeout: '+code+'; status '+await run("document.getElementById('statusLine').textContent"));
 }
 const stats=()=>run("({parts:document.getElementById('statParts').textContent,sheets:document.getElementById('statSheets').textContent,cuts:document.getElementById('statCuts').textContent,turns:document.getElementById('statTurns').textContent,rows:document.querySelectorAll('#partsBody tr').length,tabs:document.querySelectorAll('#sheetTabs button').length})");
 await until("document.getElementById('statParts').textContent==='26'");
 await run("document.getElementById('example171Btn').click()");
 await until("document.getElementById('statParts').textContent==='171'");
 const loaded=await stats();
 if(loaded.rows!==98||loaded.sheets!=='11'||loaded.cuts!=='349')throw Error('Bundled reference mismatch '+JSON.stringify(loaded));
 await run("document.getElementById('calculateBtn').click()");
 await until("document.getElementById('statusLine').textContent.startsWith('Расчёт готов')&&!document.getElementById('calculateBtn').disabled",180000);
 const recalculated=await stats();
 if(recalculated.parts!=='171'||recalculated.sheets!=='11'||Number(recalculated.cuts)>349)throw Error('GUI calculation regression '+JSON.stringify(recalculated));
 await run("document.querySelectorAll('#sheetTabs button')[10].click();document.getElementById('nextStepBtn').click()");
 const lastSheet=await run("document.querySelector('#mapSvg title').textContent");
 if(!lastSheet.includes('Лист 11.'))throw Error('Sheet navigation mismatch');
 await run("document.getElementById('navOperations').click()");
 if(!await run("document.getElementById('workspacePanel').hidden&&!document.getElementById('allOperations').hidden"))throw Error('Operation view switch');
 await run("document.getElementById('navCutting').click();document.getElementById('importBtn').click();document.getElementById('importText').value='573,5\\t228\\t2\\n118,5\\t118,5\\t12';document.getElementById('applyImport').click()");
 const imported=await run("({rows:document.querySelectorAll('#partsBody tr').length,length:document.querySelector('#partsBody input[data-key=l]').value,count:document.getElementById('partCountCaption').textContent})");
 if(imported.rows!==2||imported.length!=='573.5'||!imported.count.includes('14'))throw Error('Table import mismatch');
 await run("document.getElementById('example171Btn').click()");
 await until("document.getElementById('statParts').textContent==='171'");
 await run("document.getElementById('calculateBtn').click()");
 await new Promise(r=>setTimeout(r,300));
 await run("document.getElementById('cancelBtn').click()");
 await until("!document.getElementById('calculateBtn').disabled&&document.getElementById('statusLine').textContent.includes('отменён')");
 const screenshot=smokeReport+'.png';
 await fs.writeFile(screenshot,(await mainWindow.webContents.capturePage()).toPNG());
 const report={ok:true,packaged:app.isPackaged,platform:process.platform,arch:process.arch,version:app.getVersion(),electron:process.versions.electron,loaded,recalculated,imported,cancelVerified:true,lastSheet,screenshot};
 await fs.writeFile(smokeReport+'.tmp',JSON.stringify(report,null,2));await fs.rename(smokeReport+'.tmp',smokeReport);app.exit(0);
}

'use strict';
const {app,BrowserWindow,ipcMain,dialog}=require('electron');
const {Worker}=require('node:worker_threads');
const fs=require('node:fs/promises');
const path=require('node:path');

const coreBase=app.isPackaged?path.join(process.resourcesPath,'listpro-core'):path.resolve(__dirname,'..');
process.env.LISTPRO_CORE_DIR=path.join(coreBase,'src');
process.env.LISTPRO_CORE_RESOURCES=path.join(coreBase,'benchmarks');
const {cleanProject,loadExample}=require('./engine.cjs');
let mainWindow=null,busy=false;

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
  let settled=false;
  worker.on('message',message=>{
   if(message.kind==='progress'){if(!mainWindow?.isDestroyed())mainWindow.webContents.send('listpro:progress',message.data);return;}
   if(settled)return;settled=true;
   if(message.kind==='result')resolve(message.data);
   else reject(new Error(message.error||'Ошибка оптимизации'));
  });
  worker.on('error',e=>{if(!settled){settled=true;reject(e)}});
  worker.on('exit',code=>{if(!settled){settled=true;reject(new Error('Расчёт завершился с кодом '+code))}});
 });
}
app.whenReady().then(()=>{
 createWindow();
 ipcMain.handle('listpro:example',()=>loadExample());
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
  return cleanProject(j.project||j.parameters||j);
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
 app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});

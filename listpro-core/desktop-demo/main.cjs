'use strict';
const {app,BrowserWindow,Menu,ipcMain}=require('electron'),{Worker}=require('node:worker_threads'),path=require('node:path'),fs=require('node:fs');
const {blocksShortcut}=require('./policy.cjs');
let win,active;
const report=process.argv.find(x=>x.startsWith('--smoke-report='))?.slice(15);
if(report){const dir=path.join(app.getPath('temp'),'listpro-demo-smoke-'+process.pid);fs.mkdirSync(dir,{recursive:true});app.setPath('userData',dir);app.disableHardwareAcceleration();}
app.whenReady().then(()=>{
 Menu.setApplicationMenu(null);
 win=new BrowserWindow({width:1440,height:1000,minWidth:900,minHeight:650,show:false,title:'ЛистПро — Демо',backgroundColor:'#f7fafb',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,devTools:false,webSecurity:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.on('context-menu',e=>e.preventDefault());
 win.webContents.on('before-input-event',(e,input)=>{if(blocksShortcut(input))e.preventDefault();});
 win.webContents.session.on('will-download',e=>e.preventDefault());win.webContents.session.setPermissionRequestHandler((_w,_p,done)=>done(false));
 ipcMain.handle('demo:cancel',e=>{if(e.sender===win.webContents)active?.terminate();return true;});
 ipcMain.handle('demo:calculate',(e,input)=>{
  if(e.sender!==win.webContents)throw Error('Недоступно');if(active)throw Error('Расчёт уже выполняется.');
  return new Promise((resolve,reject)=>{
   const worker=new Worker(path.join(__dirname,'worker.cjs'),{workerData:{input,memoryPath:path.join(app.getPath('userData'),'experience-v1.json'),coreBase:app.isPackaged?path.join(__dirname,'core'):path.resolve(__dirname,'..')}});active=worker;let settled=false;
   const done=(error,value)=>{if(settled)return;settled=true;if(active===worker)active=null;error?reject(error):resolve(value);};
   worker.on('message',m=>{if(m.type==='progress'){if(!win.isDestroyed())win.webContents.send('demo:progress',m.data);}else{done(m.type==='error'?Error(m.message):null,m.result);worker.terminate();}});
   worker.on('error',e=>done(e));worker.on('exit',()=>done(Error('Расчёт остановлен.')));
  });
 });
 win.loadFile(path.join(__dirname,'renderer/index.html'));win.once('ready-to-show',()=>win.show());
 if(report)win.webContents.once('did-finish-load',()=>require('./scripts/gui-smoke.cjs').run(win).then(r=>{fs.writeFileSync(report,JSON.stringify({...r,ok:true,platform:process.platform,packaged:app.isPackaged,version:app.getVersion()}));app.exit(0);}).catch(e=>{fs.writeFileSync(report,JSON.stringify({ok:false,error:e.stack}));app.exit(1);}));
});
app.on('before-quit',()=>active?.terminate());app.on('window-all-closed',()=>app.quit());

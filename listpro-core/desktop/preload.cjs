'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('listpro',{
 example:()=>ipcRenderer.invoke('listpro:example'),
 calculate:input=>ipcRenderer.invoke('listpro:calculate',input),
 open:()=>ipcRenderer.invoke('listpro:open'),
 save:(type,data)=>ipcRenderer.invoke('listpro:save',type,data),
 onProgress:callback=>{
  const listener=(_event,message)=>callback(message);
  ipcRenderer.on('listpro:progress',listener);
  return ()=>ipcRenderer.removeListener('listpro:progress',listener);
 }
});

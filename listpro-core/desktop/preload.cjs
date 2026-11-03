'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('listpro',{
 example:name=>ipcRenderer.invoke('listpro:example',name),
 cancel:()=>ipcRenderer.invoke('listpro:cancel'),
 calculate:input=>ipcRenderer.invoke('listpro:calculate',input),
 open:()=>ipcRenderer.invoke('listpro:open'),
 save:(type,data)=>ipcRenderer.invoke('listpro:save',type,data),
 onProgress:callback=>{
  const listener=(_event,message)=>callback(message);
  ipcRenderer.on('listpro:progress',listener);
  return ()=>ipcRenderer.removeListener('listpro:progress',listener);
 }
});

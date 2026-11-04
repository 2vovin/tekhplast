'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('listproDemo',{
 calculate:input=>ipcRenderer.invoke('demo:calculate',input),
 cancel:()=>ipcRenderer.invoke('demo:cancel'),
 onProgress:callback=>ipcRenderer.on('demo:progress',(_event,data)=>callback(data))
});

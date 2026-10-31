const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('reliefDesktop',{
 getState:()=>ipcRenderer.invoke('relief:get-state'),
 weather:city=>ipcRenderer.invoke('relief:weather',city),
 resizeWidget:size=>ipcRenderer.invoke('relief:resize-widget',size),
 command:action=>ipcRenderer.invoke('relief:command',action),
 window:action=>ipcRenderer.invoke('relief:window',action),
 bridgeCode:()=>ipcRenderer.invoke('relief:bridge-code'),
 exportData:()=>ipcRenderer.invoke('relief:export'),
 prepareImport:()=>ipcRenderer.invoke('relief:import-preview'),
 confirmImport:id=>ipcRenderer.invoke('relief:import-confirm',id),
 onState:callback=>{const listener=(_event,data)=>callback(data);ipcRenderer.on('relief:state',listener);return()=>ipcRenderer.removeListener('relief:state',listener)},
 onSelectTask:callback=>{const listener=(_event,id)=>callback(id);ipcRenderer.on('relief:select-task',listener);return()=>ipcRenderer.removeListener('relief:select-task',listener)}
});

const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('yingpingDesktop',{
  navigate:url=>ipcRenderer.invoke('preview:navigate',url),
  layout:data=>ipcRenderer.send('preview:layout',data),
  back:()=>ipcRenderer.invoke('preview:back'),
  forward:()=>ipcRenderer.invoke('preview:forward'),
  external:url=>ipcRenderer.invoke('preview:external',url),
  openFile:()=>ipcRenderer.invoke('preview:file'),
  openPath:path=>ipcRenderer.invoke('preview:local-path',path),
  importFile:file=>{const path=webUtils.getPathForFile(file);return path?ipcRenderer.invoke('preview:local-path',path):Promise.resolve(null);},
  previewCode:html=>ipcRenderer.invoke('preview:local-code',html),
  devtools:()=>ipcRenderer.invoke('preview:devtools'),
  onState:callback=>ipcRenderer.on('preview:state',(_event,message)=>callback(message))
});

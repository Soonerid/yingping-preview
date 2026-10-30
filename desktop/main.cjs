'use strict';
const {app,BrowserWindow,WebContentsView,View,ipcMain,dialog,shell,Menu,screen,session}=require('electron');
const {createServer}=require('node:http');
const fs=require('node:fs'),path=require('node:path');
const {validUrl,geometry,errorMessage}=require('./common.cjs');
const {LocalPreview}=require('./local-preview.cjs');
const UI=fs.existsSync(path.join(__dirname,'public','index.html'))?path.join(__dirname,'public'):path.join(__dirname,'..');
const ASSETS=new Set(['index.html','studio.css','studio.js','devices.js','icons.js','demo.html','repair.html','preview.ico']);
const local=new LocalPreview();let win,clip,screenSurface,view,server,origin,lastGeometry='',currentGeometry,metricsTimer,lastCode=200,failed=false,pageReady=false,localView=false;
const safePreferences={nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true};
if(!app.requestSingleInstanceLock())app.quit();
else{
  app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
  app.whenReady().then(start).catch(error=>{dialog.showErrorBox('映屏未能启动',error.message);app.quit();});
}
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{clearTimeout(metricsTimer);if(view&&!view.webContents.isDestroyed())view.webContents.close();local.close();server?.close();});

function trusted(event){return win&&!win.isDestroyed()&&event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame;}
function send(message){if(win&&!win.isDestroyed())win.webContents.send('preview:state',message);}
function navigation(){const url=view.webContents.getURL();return {url,local:local.describe(url),canBack:view.webContents.navigationHistory.canGoBack(),canForward:view.webContents.navigationHistory.canGoForward()};}
async function report(){
  if(failed||!view||view.webContents.isDestroyed()||view.webContents.isLoading())return;
  const contents=view.webContents;
  try{const metrics=await contents.executeJavaScript('({width:innerWidth,height:innerHeight})');if(contents!==view.webContents||failed)return;send({type:'ready',...navigation(),width:Math.round(metrics.width),height:Math.round(metrics.height),code:lastCode});}catch{}
}
function layout(data){
  const g=geometry(data,win.getContentBounds(),win.webContents.getZoomFactor());if(!g)return;
  const key=JSON.stringify(g);if(key===lastGeometry)return;lastGeometry=key;
  clip.setBounds(g.clip);clip.setVisible(g.visible);screenSurface.setBounds(g.view);screenSurface.setBorderRadius(g.radius);view.setBounds(g.content);view.setBorderRadius(0);
  currentGeometry=g;if(pageReady)emulate();
  clearTimeout(metricsTimer);metricsTimer=setTimeout(report,180);
}
function emulate(){
  const g=currentGeometry,contents=view.webContents;if(!g||contents.isDevToolsOpened())return;
  try{
    if(!contents.debugger.isAttached())contents.debugger.attach('1.3');
    // The metrics command also enables mobile viewport-meta handling and overlay scrollbars.
    contents.debugger.sendCommand('Emulation.setDeviceMetricsOverride',{width:g.width,height:g.height,deviceScaleFactor:1,mobile:true,scale:g.scale,screenWidth:g.screenWidth,screenHeight:g.screenHeight,dontSetVisibleSize:true,screenOrientation:{type:g.width>g.height?'landscapePrimary':'portraitPrimary',angle:g.width>g.height?90:0}}).then(()=>{if(contents===view.webContents){view.setBorderRadius(0);report();}}).catch(()=>{if(contents===view.webContents)send({type:'error',message:'屏幕尺寸未能应用，请重新加载预览。'});});
  }catch{send({type:'error',message:'屏幕预览暂不可用，请关闭调试窗口后重新加载。'});}
}
function configureContents(contents){
  contents.on('will-navigate',(event,url)=>{try{validUrl(url);}catch{event.preventDefault();send({type:'error',message:'请通过本地 HTML 入口打开文件，或使用 HTTP 网页链接。'});}});
  contents.on('will-redirect',(event,url)=>{try{validUrl(url);}catch{event.preventDefault();}});
  contents.setWindowOpenHandler(({url})=>{try{validUrl(url);return {action:'allow',overrideBrowserWindowOptions:{parent:win,autoHideMenuBar:true,webPreferences:{...safePreferences,partition:local.describe(url)?'yingping-local-files':'persist:yingping-websites'}}};}catch{return {action:'deny'};}});
  contents.on('did-create-window',child=>configureContents(child.webContents));
}
function createWebView(isLocal){
  const created=new WebContentsView({webPreferences:{...safePreferences,partition:isLocal?'yingping-local-files':'persist:yingping-websites'}}),contents=created.webContents;
  configureContents(contents);const active=()=>view?.webContents===contents;
  contents.on('did-navigate',(_event,_url,code)=>{if(active()){lastCode=code;send({type:'navigation',...navigation()});}});
  contents.on('did-navigate-in-page',()=>{if(active())send({type:'navigation',...navigation()});});
  contents.on('did-finish-load',()=>{if(active()){pageReady=true;emulate();if(currentGeometry)view.setBorderRadius(0);report();}});
  contents.on('did-stop-loading',()=>{if(active())report();});
  contents.on('devtools-closed',()=>{if(active()&&pageReady)emulate();});
  contents.on('did-start-navigation',details=>{if(active()&&details.isMainFrame&&!details.isInPlace){failed=false;pageReady=false;}});
  contents.on('did-fail-load',(_event,code,description,_url,isMainFrame)=>{if(active()&&isMainFrame&&code!==-3){failed=true;clip.setVisible(false);send({type:'error',message:errorMessage(code,description)});}});
  return created;
}
function load(url){
  const checked=validUrl(url);lastCode=200;failed=false;pageReady=false;
  const isLocal=Boolean(local.describe(checked));
  if(isLocal!==localView){
    const previous=view;screenSurface.removeChildView(previous);view=createWebView(isLocal);localView=isLocal;screenSurface.addChildView(view);previous.webContents.close();
    if(currentGeometry){view.setBounds(currentGeometry.content);view.setBorderRadius(0);}
  }
  const contents=view.webContents;return contents.loadURL(checked).catch(error=>{if(contents===view.webContents&&error.code!=='ERR_ABORTED'){failed=true;clip.setVisible(false);send({type:'error',message:errorMessage(error.errno||-2,error.code||error.message)});}});
}
async function openFile(){
  const result=await dialog.showOpenDialog(win,{title:'选择要预览的本地网页',properties:['openFile'],filters:[{name:'HTML 网页',extensions:['html','htm']}]});
  if(result.canceled)return null;return local.openPath(result.filePaths[0]);
}
function startServer(){
  server=createServer((req,res)=>{
    const reply=(status,body,type='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"frame-ancestors 'self'"});res.end(body);};
    if(req.method!=='GET')return reply(405,'{}');
    let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return reply(400,'{}');}
    if(name==='/api/preview-info')return reply(200,JSON.stringify({desktop:true,bind:'127.0.0.1',lan_urls:[],download_ready:false}));
    if(name.startsWith('/api/'))return reply(401,'{}');
    if(name==='/sample/'||name==='/sample')name='/demo.html';
    if(name==='/')name='/index.html';
    name=name.slice(1);if(!ASSETS.has(name))return reply(404,'{}');
    const type={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.ico':'image/x-icon'}[path.extname(name)];
    fs.readFile(path.join(UI,name),(error,data)=>error?reply(404,'{}'):reply(200,data,type));
  });
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{origin='http://127.0.0.1:'+server.address().port;resolve();});});
}
async function start(){
  await startServer();
  const area=screen.getPrimaryDisplay().workAreaSize;
  win=new BrowserWindow({title:'映屏 · 手机与折叠屏预览台',width:Math.min(1400,area.width-60),height:Math.min(920,area.height-60),minWidth:900,minHeight:640,useContentSize:true,backgroundColor:'#f5f5f2',icon:path.join(UI,'preview.ico'),autoHideMenuBar:true,webPreferences:{...safePreferences,preload:path.join(__dirname,'preload.cjs')}});
  // A composited parent makes its clip path apply to the scaled webpage layer too.
  clip=new View();clip.setBackgroundBlur(0);screenSurface=new View();screenSurface.setBackgroundBlur(0);view=createWebView(false);screenSurface.addChildView(view);clip.addChildView(screenSurface);win.contentView.addChildView(clip);clip.setVisible(false);
  const allowed=new Set();for(const partition of ['persist:yingping-websites','yingping-local-files']){const websiteSession=session.fromPartition(partition);
  websiteSession.setPermissionCheckHandler((_contents,permission,requestOrigin)=>allowed.has(requestOrigin+'|'+permission));
  websiteSession.setPermissionRequestHandler(async(contents,permission,callback)=>{
    if(!['media','geolocation','notifications','clipboard-read'].includes(permission))return callback(false);
    let site;try{site=new URL(contents.getURL()).origin;}catch{return callback(false);}
    const names={media:'摄像头或麦克风',geolocation:'位置',notifications:'通知', 'clipboard-read':'读取剪贴板'};
    const choice=await dialog.showMessageBox(win,{type:'question',buttons:['不允许','仅本次运行允许'],defaultId:0,cancelId:0,message:site+' 申请使用'+names[permission],detail:'只有你明确允许后，该网页才能使用这项能力。'});
    const permit=choice.response===1;if(permit)allowed.add(site+'|'+permission);callback(permit);
  });
  websiteSession.on('will-download',async(event,item)=>{event.preventDefault();send({type:'error',message:'网页尝试下载文件。请在普通浏览器中打开该网址后下载。'});});
  }
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(origin+'/'))event.preventDefault();});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  const handle=(name,fn)=>ipcMain.handle('preview:'+name,(event,arg)=>{if(!trusted(event))throw Error('此操作只接受映屏界面调用。');return fn(arg);});
  handle('navigate',load);handle('back',()=>{if(view.webContents.navigationHistory.canGoBack())view.webContents.navigationHistory.goBack();});handle('forward',()=>{if(view.webContents.navigationHistory.canGoForward())view.webContents.navigationHistory.goForward();});handle('file',openFile);
  handle('local-path',raw=>local.openPath(raw));handle('local-code',html=>local.openCode(html));handle('devtools',()=>view.webContents.openDevTools({mode:'detach'}));
  handle('external',url=>shell.openExternal(validUrl(url)));
  ipcMain.on('preview:layout',(event,data)=>{if(trusted(event))layout(data);});
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'文件',submenu:[{label:'输入网址',accelerator:'CmdOrCtrl+L',click:()=>send({type:'focus-address'})},{label:'打开本地HTML',accelerator:'CmdOrCtrl+O',click:()=>send({type:'open-local'})},{type:'separator'},{role:'quit',label:'退出'}]},{label:'编辑',submenu:[{role:'undo',label:'撤销'},{role:'redo',label:'重做'},{type:'separator'},{role:'cut',label:'剪切'},{role:'copy',label:'复制'},{role:'paste',label:'粘贴'},{role:'selectAll',label:'全选'}]}]));
  await win.loadURL(origin+'/');
}

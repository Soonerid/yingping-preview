(()=>{
  'use strict';
  const $=s=>document.querySelector(s),C=DevicePreview,frame=$('#previewFrame'),D=window.yingpingDesktop;
  let device=C.devices[0],fold='normal',rotated=false,custom=null,loadedUrl='',timer,inspectTimer,hasLoaded=false,activeMode='embed';
  const config=JSON.parse($('#viewerConfig').textContent),icons=()=>window.lucide?.createIcons();
  let nativeFailed=false,nativeAnimation;
  let localSource=null,draggingFile=false;
  if(D){document.body.classList.add('desktop-mode');for(const item of document.querySelectorAll('.native-only'))item.hidden=false;$('#previewModeSection').hidden=true;$('#shareButton span').textContent='分享网页';}
  if(D){const guide=$('#helpDialog .help-content').querySelectorAll(':scope > p');guide[0].textContent='粘贴 HTTP 或 HTTPS 地址，选择右上角的机型。桌面版使用独立浏览内核直接载入网页，折叠、旋转和缩放保留同一个页面；也可用文件按钮选择本地 HTML。';guide[2].textContent='把 Windows 使用包发给同事，完整解压后打开映屏.exe。分享网页按钮复制目标地址；本地项目服务、文件与登录状态需要各自准备。';guide[3].textContent='桌面版可直接预览禁止嵌入的网页。目标服务未启动、网络异常、证书或账号限制仍需分别处理；网站下载附件或打开专用应用时，请用普通浏览器继续。';$('#externalPanel small').textContent='无法访问时，请在普通浏览器检查网址或目标服务。';}
  for(const brand of [...new Set(C.devices.map(d=>d.brand))]){const group=document.createElement('optgroup');group.label=brand;for(const item of C.devices.filter(d=>d.brand===brand)){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;group.append(option);}$('#deviceSelect').append(group);}
  function dimensions(){return C.screen(device,fold,rotated,custom);}
  function screenIsWide(){const size=C.screen(device,fold,false,custom);return size.width>size.height;}
  function status(text,waiting=false){$('#previewStatus').textContent=text;$('#statusDot').classList.toggle('waiting',waiting);}
  function layout(){
    const {width,height}=dimensions(),canvas=$('#canvas'),scale=$('#zoomSelect').value==='fit'?C.fit(width,height,canvas.clientWidth,canvas.clientHeight):Number($('#zoomSelect').value);
    const outerWidth=width+18,outerHeight=height+18;
    $('#deviceFrame').style.width=outerWidth+'px';$('#deviceFrame').style.height=outerHeight+'px';$('#deviceFrame').style.transform='scale('+scale+')';$('#deviceFrame').classList.toggle('wide',screenIsWide());
    renderHardware();
    $('#deviceSpace').style.width=outerWidth*scale+'px';$('#deviceSpace').style.height=outerHeight*scale+'px';
    $('#viewportLabel').textContent=width+' × '+height;$('#scaleLabel').textContent=Math.round(scale*100)+'% 显示';
    $('#deviceName').textContent=device.name;$('#screenBadge').textContent=dimensions().label;$('#orientationLabel').textContent=width>height?'横屏':'竖屏';
    $('.inspector').classList.toggle('is-fold',Boolean(device.screens.open));
    $('#foldControls').hidden=!device.screens.open;for(const b of document.querySelectorAll('[data-fold]'))b.setAttribute('aria-pressed',String(b.dataset.fold===fold));
    $('#widthInput').value=width;$('#heightInput').value=height;
    $('#reopenButton').textContent='按 '+width+' × '+height+' 打开';
    if(hasLoaded&&activeMode==='embed'){clearTimeout(inspectTimer);inspectTimer=setTimeout(inspect,280);}
    if(D)animateNative();
  }
  function renderHardware(){
    const size=dimensions(),keys=$('#hardwareKeys');keys.replaceChildren();
    for(const key of C.hardware(device,fold,rotated)){
      const bar=document.createElement('span'),horizontal=['top','bottom'].includes(key.side),edge=horizontal?size.width+18:size.height+18;
      bar.className='hardware-key key-'+key.side;bar.dataset.key=key.name;
      bar.style.setProperty('--key-position',key.position*100+'%');bar.style.setProperty('--key-length',edge*key.length+'px');keys.append(bar);
    }
  }
  function syncNative(){
    if(!D)return;const r=$('.screen-surface').getBoundingClientRect(),clip=$('#canvas').getBoundingClientRect(),size=dimensions();
    D.layout({rect:{x:r.x,y:r.y,width:r.width,height:r.height},clip:{x:clip.x,y:clip.y,width:clip.width,height:clip.height},width:size.width,height:size.height,scale:r.width/size.width,radius:(screenIsWide()?19:26)*(r.width/size.width),visible:activeMode==='native'&&!nativeFailed&&!draggingFile&&!document.querySelector('dialog[open]')});
  }
  function animateNative(){cancelAnimationFrame(nativeAnimation);const end=performance.now()+330;const tick=()=>{syncNative();if(performance.now()<end)nativeAnimation=requestAnimationFrame(tick);};tick();}
  function nativeError(message){nativeFailed=true;$('#externalPanel').hidden=false;$('#deviceSpace').hidden=true;$('#loadOverlay').hidden=true;$('#externalHeading').textContent='这个页面暂时没有打开';$('#externalMessage').textContent=message;$('#externalHost').textContent=loadedUrl;$('#reopenButton').textContent='重新加载';$('#tryEmbedButton').hidden=true;status(message,true);syncNative();}
  function loadNative(url){activeMode='native';nativeFailed=false;$('#externalPanel').hidden=true;$('#deviceSpace').hidden=false;$('#tryEmbedButton').hidden=false;$('#embedNotice').hidden=true;$('#loadOverlay').hidden=false;$('#urlInput').value=url;$('#externalButton').href=url;$('#stageHost').textContent=new URL(url).host||'本地HTML文件';status('正在加载网页',true);syncNative();D.navigate(url).catch(error=>nativeError(error.message));}
  function localUi(){
    $('#localActions').hidden=!localSource;$('#externalButton').setAttribute('aria-disabled',String(Boolean(localSource&&!D)));
    if(localSource){$('#stageHost').textContent=localSource.name;if(!D||loadedUrl===localSource.url)$('#urlInput').value=localSource.path||localSource.name;}
  }
  function localMessage(text,error=false){$('#localMessage').textContent=text;$('#localMessage').classList.toggle('error',error);}
  function showLocalDialog(){localMessage('只做预览，不修改原文件。');$('#localDialog').showModal();syncNative();}
  function localError(error){if(!$('#localDialog').open)showLocalDialog();localMessage(error.message||'没有打开这个 HTML，请重新选择。',true);}
  function acceptLocal(source){localSource=source;loadedUrl=source.url;hasLoaded=false;$('#addressError').hidden=true;$('#modeSelect').value='auto';$('#localDialog').close();loadNative(loadedUrl);localUi();}
  async function previewLocalCode(raw,name='粘贴的 HTML'){
    if(D){acceptLocal(await D.previewCode(raw));return;}
    const code=String(raw).trim().replace(/^```(?:html)?\s*\r?\n([\s\S]*?)\r?\n```$/i,'$1');
    if(!code.trim())throw Error('还没有 HTML 内容。');if(new Blob([code]).size>20*1024*1024)throw Error('HTML 超过 20 MB，请精简后再预览。');
    const doc=new DOMParser().parseFromString(code,'text/html');if(!doc.querySelector('base')){const base=doc.createElement('base');base.href='about:blank';doc.head.prepend(base);}
    localSource={kind:'code',name,code};loadedUrl='';activeMode='local';hasLoaded=false;clearTimeout(timer);clearTimeout(inspectTimer);
    $('#addressError').hidden=true;$('#localDialog').close();$('#externalPanel').hidden=true;$('#deviceSpace').hidden=false;$('#embedNotice').hidden=true;$('#loadOverlay').hidden=true;
    frame.setAttribute('sandbox','allow-scripts allow-forms allow-popups');frame.srcdoc='<!doctype html>\n'+doc.documentElement.outerHTML;
    status('正在打开本地 HTML',true);localUi();layout();
  }
  async function importHtml(file){
    if(!file||!/^.*\.html?$/i.test(file.name))throw Error('请选择 .html 或 .htm 文件。');
    if(file.size>20*1024*1024)throw Error('HTML 超过 20 MB，请精简后再预览。');
    if(D){const source=await D.importFile(file);if(source){acceptLocal(source);return;}}
    await previewLocalCode(await file.text(),file.name);
  }
  $('#localFileButton').onclick=showLocalDialog;$('#closeLocal').onclick=()=>$('#localDialog').close();
  if(D)$('#localHint').textContent='选择 HTML 后，会读取它所在文件夹中的图片、CSS 和脚本；目录结构保留即可。';
  $('#chooseLocal').onclick=async()=>{try{if(D){const source=await D.openFile();if(source)acceptLocal(source);}else $('#htmlFileInput').click();}catch(error){localError(error);}};
  $('#htmlFileInput').onchange=async e=>{try{await importHtml(e.target.files[0]);}catch(error){localError(error);}finally{e.target.value='';}};
  $('#previewHtmlCode').onclick=async()=>{const button=$('#previewHtmlCode');button.disabled=true;try{await previewLocalCode($('#htmlCode').value);}catch(error){localError(error);}finally{button.disabled=false;}};
  $('#clearHtmlCode').onclick=()=>{$('#htmlCode').value='';$('#htmlCode').focus();localMessage('代码已清空。');};
  $('#localReload').onclick=()=>$('#reloadButton').click();$('#localDebug').onclick=()=>D?.devtools();
  function fileDrag(event){return Array.from(event.dataTransfer?.types||[]).includes('Files');}
  function dragState(active){draggingFile=active;$('#fileDropOverlay').hidden=!active;syncNative();}
  document.addEventListener('dragover',event=>{if(fileDrag(event)){event.preventDefault();event.dataTransfer.dropEffect='copy';if(!$('#localDialog').open)dragState(true);}});
  document.addEventListener('dragleave',event=>{if(!event.relatedTarget)dragState(false);});
  document.addEventListener('drop',async event=>{if(!fileDrag(event))return;event.preventDefault();dragState(false);try{const files=event.dataTransfer.files;if(files.length!==1)throw Error('每次请导入一个 HTML 文件。');await importHtml(files[0]);}catch(error){localError(error);}});
  window.addEventListener('blur',()=>dragState(false));
  function inspect(){
    if(activeMode!=='embed')return;
    try{const doc=frame.contentDocument;if(!doc||doc.URL==='about:blank'){unverified();return;}$('#embedNotice').hidden=true;hasLoaded=true;const width=frame.clientWidth,overflow=Math.max(doc.documentElement.scrollWidth,doc.body?.scrollWidth||0)-width;status(overflow>2?'已载入 · 页面有约 '+Math.ceil(overflow)+' px 横向溢出':'已载入 · 当前页面可交互');}
    catch{unverified();}
  }
  function unverified(){hasLoaded=false;$('#embedNotice').hidden=false;status('无法确认外部页面是否载入 · 灰屏请用独立窗口',true);}
  function showExternal(){
    activeMode='window';hasLoaded=false;clearTimeout(timer);clearTimeout(inspectTimer);$('#loadOverlay').hidden=true;$('#embedNotice').hidden=true;$('#externalPanel').hidden=false;$('#deviceSpace').hidden=true;frame.src='about:blank';$('#externalHost').textContent=new URL(loadedUrl).host;layout();
  }
  function openStandalone(){
    if(!loadedUrl)return;const {width,height}=dimensions();showExternal();
    try{window.open(loadedUrl,'_blank',C.popupFeatures(width,height,window.screen)+',noopener,noreferrer');$('#externalHeading').textContent='已请求独立浏览窗口';$('#externalMessage').textContent='未看到新窗口时，点击地址栏右侧的新标签页按钮。网页版遇到禁止嵌入的网站，可用桌面版在画布中直接预览。';status('已请求 '+width+' × '+height+' 独立窗口 · 实际尺寸由浏览器决定');}
    catch{$('#externalHeading').textContent='浏览器未能打开新窗口';$('#externalMessage').textContent='请点击地址栏右侧的新标签页按钮直接访问网页。';status('请用新标签页打开网页',true);}
  }
  function navigate(raw,forceEmbed=false,openWindow=true){
    const input=String(raw).trim().replace(/^"([\s\S]*)"$/,'$1');
    if(D&&(/^[a-z]:[\\/]/i.test(input)||/^file:/i.test(input))){D.openPath(input).then(acceptLocal).catch(localError);return;}
    if(localSource&&raw===(localSource.path||localSource.name)){$('#reloadButton').click();return;}
    let url;try{url=C.normalize(raw,location.href);}catch(error){$('#addressError').textContent=error.message;$('#addressError').hidden=false;return;}
    localSource=null;localUi();frame.removeAttribute('srcdoc');frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups allow-downloads');
    $('#addressError').hidden=true;loadedUrl=url;hasLoaded=false;$('#urlInput').value=url;$('#externalButton').href=url;$('#stageHost').textContent=new URL(url).host;clearTimeout(timer);
    if(D){loadNative(url);return;}
    if(!forceEmbed&&C.route($('#modeSelect').value,url,location.href)==='window'){
      if(openWindow)openStandalone();else{showExternal();$('#externalHeading').textContent='分享的网页已准备好';$('#externalMessage').textContent='点击下方按钮，以所选屏幕尺寸请求独立窗口。';status('已还原屏幕设置 · 点击按钮打开外部网页');}return;
    }
    activeMode='embed';$('#externalPanel').hidden=true;$('#deviceSpace').hidden=false;$('#embedNotice').hidden=true;$('#loadOverlay').hidden=false;$('#loadText').textContent='正在打开页面';status('正在加载预览',true);frame.src=url;
    timer=setTimeout(()=>{if(hasLoaded||activeMode!=='embed')return;$('#loadOverlay').hidden=true;unverified();},12000);
  }
  frame.addEventListener('load',()=>{if(activeMode==='local'){hasLoaded=true;status('本地 HTML 已打开 · 切换机型查看排版');return;}if(!loadedUrl||activeMode!=='embed')return;clearTimeout(timer);$('#loadOverlay').hidden=true;inspect();});
  $('#addressForm').onsubmit=e=>{e.preventDefault();navigate($('#urlInput').value);};
  $('#reloadButton').onclick=()=>{if(!D&&localSource){previewLocalCode(localSource.code,localSource.name).catch(localError);}else if(D&&activeMode==='native'){nativeFailed=false;loadNative(loadedUrl);localUi();}else if(loadedUrl)navigate(loadedUrl);};
  $('#externalButton').onclick=e=>{if(D){e.preventDefault();D.external(loadedUrl);}else if(!loadedUrl||localSource)e.preventDefault();};
  $('#reopenButton').onclick=()=>D&&nativeFailed?loadNative(loadedUrl):openStandalone();$('#unverifiedWindow').onclick=openStandalone;
  $('#tryEmbedButton').onclick=()=>{$('#modeSelect').value='embed';navigate(loadedUrl,true);};
  $('#modeSelect').onchange=()=>status('预览方式已更改，点击“打开预览”应用');
  $('#sampleButton').onclick=()=>{$('#modeSelect').value='auto';navigate(config.sample);};
  $('#deviceSelect').onchange=e=>{device=C.devices.find(d=>d.id===e.target.value);fold=device.screens.open?'open':'normal';rotated=false;custom=null;if(device.id==='custom')showCustom(true);layout();};
  for(const b of document.querySelectorAll('[data-fold]'))b.onclick=()=>{fold=b.dataset.fold;rotated=false;custom=null;layout();};
  $('#rotateButton').onclick=()=>{rotated=!rotated;layout();};$('#zoomSelect').onchange=layout;
  function showCustom(open){$('#customPanel').hidden=!open;$('#customToggle').setAttribute('aria-expanded',String(open));}
  $('#customToggle').onclick=()=>showCustom($('#customPanel').hidden);
  $('#customPanel').onsubmit=e=>{e.preventDefault();const width=Number($('#widthInput').value),height=Number($('#heightInput').value);if(!Number.isInteger(width)||!Number.isInteger(height)||width<240||height<240||width>2560||height>2560)return;custom=[width,height];rotated=false;layout();};
  $('#restoreSize').onclick=()=>{custom=null;rotated=false;layout();};
  function describe(){const item=dimensions(),all=Object.values(device.screens),node=$('#specDetails');node.replaceChildren();const p=document.createElement('p');p.textContent=device.name+' · 当前参考视口 '+item.width+' × '+item.height+' CSS px';node.append(p);if(device.source){const sizes=document.createElement('p');sizes.textContent=all.map(s=>s.label+'：'+s.pixels.join(' × ')+' 屏幕像素').join('；');node.append(sizes);const a=document.createElement('a');a.href=device.source;a.target='_blank';a.rel='noopener noreferrer';a.textContent='查看厂商参数来源';node.append(a);}}
  $('#helpButton').onclick=()=>{describe();$('#helpDialog').showModal();};$('#closeHelp').onclick=()=>$('#helpDialog').close();$('#helpDialog').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}});
  function shareMessage(message,warning=false){$('#shareMessage').textContent=message;$('#shareMessage').classList.toggle('warning',warning);}
  function buildShare(){
    try{const target=new URL(loadedUrl);$('#loopbackOption').hidden=!(C.loopback(target.hostname)&&target.origin!==location.origin);
      $('#shareUrl').value=C.shareLink({base:$('#shareBase').value,current:location.href,target:loadedUrl,device:device.id,fold,rotated,custom,mode:$('#modeSelect').value,zoom:$('#zoomSelect').value,rewriteLocal:$('#rewriteLocal').checked});
      $('#copyShare').disabled=false;shareMessage('已包含当前网页、机型和屏幕设置。');
    }catch(error){$('#shareUrl').value='';$('#copyShare').disabled=true;shareMessage(error.message,true);}
  }
  $('#shareButton').onclick=async()=>{
    if(localSource){$('#addressError').textContent='本地 HTML 没有上传；请把 HTML 和配套素材一起发给对方。';$('#addressError').hidden=false;return;}
    $('#shareDialog').showModal();$('#shareBase').replaceChildren();$('#rewriteLocal').checked=false;$('#copyShare').disabled=true;$('#shareUrl').value='';shareMessage('正在查找本机局域网地址…');
    if(D){syncNative();$('#shareDialog .dialog-intro').textContent='复制网页地址，对方在自己的映屏中打开；本机服务仍需单独启动。';$('#shareDialog .share-notes p').textContent='对方需能访问这个网页。localhost、登录状态和本地文件不会随地址共享。';$('#shareDialog .privacy-note').textContent='只复制目标网页地址，不共享本机浏览数据。';$('#shareBase').append(new Option('目标网页地址','target'));$('#shareBase').disabled=true;$('#loopbackOption').hidden=true;$('#shareUrl').value=loadedUrl.startsWith('file:')?'':loadedUrl;$('#copyShare').disabled=!$('#shareUrl').value;$('#downloadPackage').hidden=true;shareMessage(loadedUrl.startsWith('file:')?'本地文件需要把HTML和配套文件一起交给对方。':C.loopback(new URL(loadedUrl).hostname)?'localhost 指对方自己的电脑；请改用可访问的局域网或公网地址。':'只复制网页地址，不共享登录状态。',true);return;}
    let info={};try{const response=await fetch('/api/preview-info');if(response.ok)info=await response.json();}catch{}
    const options=C.loopback(location.hostname)?(info.lan_urls||[]):[location.origin+'/'];
    for(const url of options){const option=document.createElement('option');option.value=url;option.textContent=url;$('#shareBase').append(option);}
    $('#downloadPackage').hidden=!info.download_ready;
    if(!options.length){$('#shareBase').append(new Option('暂无可分享的局域网地址',''));shareMessage('请使用“局域网共享启动.cmd”启动，并连接 Wi-Fi。',true);return;}buildShare();
  };
  $('#shareBase').onchange=buildShare;$('#rewriteLocal').onchange=buildShare;
  $('#copyShare').onclick=async()=>{try{if(!navigator.clipboard?.writeText)throw new Error();await navigator.clipboard.writeText($('#shareUrl').value);shareMessage(D?'已复制网页地址，对方可在映屏中打开。':'已复制，把链接发给同一 Wi-Fi 下的朋友吧。');}catch{$('#shareUrl').focus();$('#shareUrl').select();shareMessage('浏览器不允许直接复制，链接已选中，请按 Ctrl+C 或长按复制。',true);}};
  $('#closeShare').onclick=()=>$('#shareDialog').close();
  if(D){
    D.onState(message=>{if(message.type==='focus-address'){$('#urlInput').focus();$('#urlInput').select();return;}if(message.type==='open-local'){showLocalDialog();return;}if(message.type==='error'){nativeError(message.message);return;}if(message.url){loadedUrl=message.url;localSource=message.local||null;$('#urlInput').value=loadedUrl;$('#externalButton').href=loadedUrl;$('#stageHost').textContent=new URL(loadedUrl).host||'本地HTML文件';localUi();}$('#backButton').disabled=!message.canBack;$('#forwardButton').disabled=!message.canForward;if(message.type==='ready'){nativeFailed=false;if(activeMode==='native'){$('#externalPanel').hidden=true;$('#deviceSpace').hidden=false;}$('#loadOverlay').hidden=true;status(message.code>=400?'网页返回 '+message.code+' · 可能需要登录或检查地址':(localSource?'本地预览':'已载入')+' · 实际视口 '+message.width+' × '+message.height);syncNative();}});
    $('#backButton').onclick=()=>D.back();$('#forwardButton').onclick=()=>D.forward();
    window.addEventListener('scroll',syncNative,true);window.addEventListener('resize',animateNative);new MutationObserver(syncNative).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  }
  new ResizeObserver(layout).observe($('#canvas'));icons();
  function restorePreset(){
    let initial;try{initial=C.preset(location.hash,location.href);}catch(error){$('#addressError').textContent='分享链接无效：'+error.message;$('#addressError').hidden=false;return;}
    device=initial.device;fold=initial.fold;rotated=initial.rotated;custom=initial.custom;$('#deviceSelect').value=device.id;$('#modeSelect').value=D?'auto':initial.mode;$('#zoomSelect').value=initial.zoom;
    layout();showCustom(Boolean(custom));navigate(initial.target||config.sample,false,false);
  }
  window.addEventListener('hashchange',restorePreset);restorePreset();
})();

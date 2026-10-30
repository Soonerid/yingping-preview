window.DevicePreview=(()=>{
  const devices=[
    {id:'puraxmax',name:'HUAWEI Pura X Max',brand:'华为',source:'https://consumer.huawei.com/cn/phones/pura-x-max/specs/',screens:{closed:{label:'合上 · 外屏',pixels:[1264,1848],viewport:[421,616]},open:{label:'展开 · 内屏',pixels:[2584,1828],viewport:[861,609]}}},
    {id:'pura70pro',name:'HUAWEI Pura 70 Pro',brand:'华为',source:'https://consumer.huawei.com/sg/phones/pura70-pro/specs/',screens:{normal:{label:'直屏',pixels:[1260,2844],viewport:[420,948]}}},
    {id:'iphone17',name:'iPhone 17',brand:'Apple',source:'https://www.apple.com.cn/iphone-17/specs/',screens:{normal:{label:'直屏',pixels:[1206,2622],viewport:[402,874]}}},
    {id:'iphone17promax',name:'iPhone 17 Pro Max',brand:'Apple',source:'https://www.apple.com/gw/iphone-17-pro/specs/',screens:{normal:{label:'直屏',pixels:[1320,2868],viewport:[440,956]}}},
    {id:'xiaomi15',name:'Xiaomi 15',brand:'小米',source:'https://www.mi.com/global/product/xiaomi-15/specs/',screens:{normal:{label:'直屏',pixels:[1200,2670],viewport:[400,890]}}},
    {id:'vivox200',name:'vivo X200',brand:'vivo',source:'https://www.vivo.com.cn/vivo/param/x200',screens:{normal:{label:'直屏',pixels:[1260,2800],viewport:[420,933]}}},
    {id:'oppofindx8',name:'OPPO Find X8',brand:'OPPO',source:'https://www.oppo.com/cn/smartphones/series-find-x/find-x8/specs/',screens:{normal:{label:'直屏',pixels:[1256,2760],viewport:[419,920]}}},
    {id:'honormagic7pro',name:'HONOR Magic7 Pro',brand:'荣耀',source:'https://www.honor.com/sa-en/phones/honor-magic7-pro/spec/',screens:{normal:{label:'直屏',pixels:[1280,2800],viewport:[427,933]}}},
    {id:'galaxys25',name:'Samsung Galaxy S25',brand:'三星',source:'https://www.samsung.com/in/smartphones/galaxy-s/galaxy-s25-mint-128gb-sm-s931blgbins/',screens:{normal:{label:'直屏',pixels:[1080,2340],viewport:[360,780]}}},
    {id:'oneplus13',name:'OnePlus 13',brand:'一加',source:'https://www.oneplus.com/us/13/specs',screens:{normal:{label:'直屏',pixels:[1440,3168],viewport:[480,1056]}}},
    {id:'custom',name:'自定义视口',brand:'自定义',screens:{normal:{label:'自定义',viewport:[390,844]}}}
  ];
  function screen(device,fold,rotated=false,custom=null){
    const key=device.screens[fold]?fold:Object.keys(device.screens)[0],spec=device.screens[key];let [width,height]=custom||spec.viewport;
    if(rotated)[width,height]=[height,width];return {width,height,label:custom?'已校准视口':spec.label,key,pixels:spec.pixels};
  }
  function fit(width,height,availableWidth,availableHeight){return Math.max(.1,Math.min(1,(availableWidth-64)/(width+18),(availableHeight-60)/(height+18)));}
  function hardware(device,fold,rotated=false){
    if(device.id==='custom')return [];
    // Positions are proportional shell illustrations, referenced from front-facing product diagrams.
    const keys=device.brand==='Apple'?
      [['action','left',.18,.025],['volume-up','left',.245,.045],['volume-down','left',.315,.045],['power','right',.28,.07],['camera','right',.65,.05]]:
      [['volume','right',.25,.095],['power','right',.405,.05]];
    if(['oneplus13','oppofindx8'].includes(device.id))keys.push(['alert','left',.22,.04]);
    return keys.map(([name,side,position,length])=>{
      if(rotated){side=side==='right'?'top':'bottom';}
      return {name,side,position,length};
    });
  }
  function normalize(input,base){
    let value=String(input||'').trim();const markdown=value.match(/^\[[^\]]*\]\((https?:\/\/[^\s)]+)\)$/i);if(markdown)value=markdown[1];
    if(!value)throw new Error('先输入一个预览地址。');
    const links=value.match(/https?:\/\/[^\s<>"）)]+/ig);if(links?.length>1)throw new Error('一次只预览一个链接，请单独粘贴要查看的地址。');if(links?.length===1&&/\s/.test(value))value=links[0].replace(/[，。；,;]+$/,'');
    if(!/^https?:\/\//i.test(value)&&!value.startsWith('/')){
      const hostPort=/^(?:[\w.-]+|\[::1\]):\d+(?:[/?#]|$)/i.test(value);
      if(/^[a-z][a-z\d+.-]*:/i.test(value)&&!hostPort)throw new Error('请使用 HTTP 或 HTTPS 网页地址。');
      value=(hostPort||/^(localhost|\[::1\]|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(value)?'http://':'https://')+value;
    }
    let url;try{url=new URL(value,base);}catch{throw new Error('地址格式不完整，请检查后重试。');}
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('请使用不含账号密码的 HTTP 或 HTTPS 地址。');
    const parent=new URL(base);if(url.origin===parent.origin&&['/','/index.html'].includes(url.pathname))throw new Error('这个地址是预览台本身，请填写要预览的页面地址。');
    return url.href;
  }
  function route(mode,url,base){
    if(mode==='embed'||mode==='window')return mode;
    const target=new URL(url),parent=new URL(base),host=target.hostname;
    const local=host==='localhost'||host.endsWith('.localhost')||host==='[::1]'||/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
    return target.origin===parent.origin||local?'embed':'window';
  }
  function popupFeatures(width,height,display={}){
    const left=Math.max(0,Math.round(((display.availWidth||width)-width)/2)),top=Math.max(0,Math.round(((display.availHeight||height)-height)/2));
    return 'popup=yes,width='+width+',height='+height+',left='+left+',top='+top;
  }
  function loopback(host){return host==='localhost'||host.endsWith('.localhost')||host==='[::1]'||/^127\./.test(host);}
  function preset(hash,base){
    const p=new URLSearchParams(hash.replace(/^#/,'')),id=p.get('device'),device=devices.find(d=>d.id===id)||devices[0];
    const fold=device.screens[p.get('fold')]?p.get('fold'):device.screens.open?'open':Object.keys(device.screens)[0];
    const width=Number(p.get('w')),height=Number(p.get('h')),custom=Number.isInteger(width)&&Number.isInteger(height)&&width>=240&&height>=240&&width<=2560&&height<=2560?[width,height]:null;
    const mode=['auto','embed','window'].includes(p.get('mode'))?p.get('mode'):'auto',zoom=['fit','1','0.75','0.5'].includes(p.get('zoom'))?p.get('zoom'):'fit';
    return {device,fold,custom,mode,zoom,rotated:p.get('rotate')==='1',target:p.has('url')?normalize(p.get('url'),base):null};
  }
  function shareLink({base,current,target,device,fold,rotated,custom,mode,zoom,rewriteLocal=false}){
    const origin=new URL(base),source=new URL(current),url=new URL(normalize(target,current));
    if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password||loopback(origin.hostname))throw new Error('预览台尚未向局域网开放，请使用“局域网共享启动.cmd”启动。');
    if(url.origin===source.origin)url.host=origin.host;
    else if(loopback(url.hostname)){if(!rewriteLocal)throw new Error('目标网页还使用 localhost。请先把目标项目向局域网开放，再勾选地址替换。');url.hostname=origin.hostname;}
    const p=new URLSearchParams({url:url.href,device,fold,mode,zoom});if(rotated)p.set('rotate','1');if(custom){p.set('w',custom[0]);p.set('h',custom[1]);}
    origin.pathname='/';origin.search='';origin.hash=p.toString();return origin.href;
  }
  return {devices,screen,fit,hardware,normalize,route,popupFeatures,loopback,preset,shareLink};
})();

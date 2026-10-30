const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx={window:{},URL};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'devices.js'),'utf8'),ctx);const C=ctx.window.DevicePreview,base='http://127.0.0.1:8780/';let count=0;
function check(fn){fn();count++;}
for(const url of ['https://example.org/page','https://example.net/page','https://example.com/'])check(()=>assert.equal(C.route('auto',url,base),'window'));
for(const url of ['http://127.0.0.1:8766/','http://localhost:3000/','http://192.168.1.50:8767/','http://172.16.2.3/','http://192.168.1.10/','http://[::1]:8000/','http://127.0.0.1:8780/sample/'])check(()=>assert.equal(C.route('auto',url,base),'embed'));
check(()=>assert.equal(C.route('embed','https://example.org/page',base),'embed'));
check(()=>assert.equal(C.route('window','http://127.0.0.1:8766/',base),'window'));
check(()=>assert.match(C.popupFeatures(421,616,{availWidth:1920,availHeight:1080}),/width=421,height=616,left=750,top=232/));
check(()=>assert.match(C.popupFeatures(861,609,{}),/left=0,top=0/));
const source=fs.readFileSync(path.join(root,'studio.js'),'utf8');
const start=source.indexOf('  function openStandalone()'),end=source.indexOf('  function navigate(',start),implementation=source.slice(start,end);
function nativeWindow({blocked=false,fail=false,url='https://example.org/page'}={}){
  const nodes={},events=[],$=id=>nodes[id]||(nodes[id]={textContent:''});
  const popup={};
  const env={$ ,D:undefined,loadedUrl:url,dimensions:()=>({width:421,height:616}),showExternal:()=>events.push(['panel']),C,window:{screen:{availWidth:1920,availHeight:1080},open(...args){events.push(['open',...args]);if(fail)throw Error('blocked');return blocked?null:popup;}},status:(...args)=>events.push(['status',...args])};
  vm.createContext(env);vm.runInContext(implementation+'\nopenStandalone();',env);return {nodes,events,popup};
}
check(()=>{const r=nativeWindow(),call=r.events.find(e=>e[0]==='open');assert.equal(call[1],'https://example.org/page');assert.match(call[3],/noopener,noreferrer/);assert.match(r.nodes['#externalHeading'].textContent,/已请求/);assert.doesNotMatch(r.nodes['#externalHeading'].textContent,/加载成功/);});
check(()=>{const r=nativeWindow({blocked:true});assert.match(r.nodes['#externalHeading'].textContent,/已请求/);assert.match(r.nodes['#externalMessage'].textContent,/新标签页/);});
check(()=>{const r=nativeWindow({fail:true});assert.match(r.nodes['#externalHeading'].textContent,/未能/);});
check(()=>{const r=nativeWindow({url:''});assert.equal(r.events.length,0);});
const inspectStart=source.indexOf('  function inspect()'),inspectEnd=source.indexOf('  function showExternal()',inspectStart),inspection=source.slice(inspectStart,inspectEnd);
check(()=>{let state;const nodes={},env={activeMode:'embed',frame:{contentDocument:null},hasLoaded:false,$:id=>nodes[id]||(nodes[id]={}),status:(text,warning)=>state={text,warning}};vm.createContext(env);vm.runInContext(inspection+'\ninspect();',env);assert.equal(env.hasLoaded,false);assert.equal(state.warning,true);assert.match(state.text,/无法确认/);});
console.log(`${count} native preview routing, popup isolation and unverified-frame checks passed.`);

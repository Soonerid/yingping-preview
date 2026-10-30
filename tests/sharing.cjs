const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={window:{},URL,URLSearchParams};vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../devices.js'),'utf8'),ctx);const C=ctx.window.DevicePreview;
let count=0;function check(fn){fn();count++;}
const base='http://192.168.1.50:8780/',current='http://127.0.0.1:8780/',settings={base,current,target:current+'sample/',device:'puraxmax',fold:'open',rotated:true,custom:[800,600],mode:'embed',zoom:'0.75'};
check(()=>{const url=new URL(C.shareLink(settings));assert.equal(url.origin,new URL(base).origin);assert.equal(url.search,'');const p=C.preset(url.hash,base);assert.equal(p.target,base+'sample/');assert.equal(p.device.id,'puraxmax');assert.equal(p.fold,'open');assert.equal(p.rotated,true);assert.equal(p.mode,'embed');assert.equal(p.zoom,'0.75');assert.deepEqual(Array.from(p.custom),[800,600]);});
check(()=>assert.throws(()=>C.shareLink({...settings,target:'http://localhost:8766/'}),/localhost/));
check(()=>{const p=C.preset(new URL(C.shareLink({...settings,target:'http://localhost:8766/path?a=b#inside',rewriteLocal:true})).hash,base);assert.equal(p.target,'http://192.168.1.50:8766/path?a=b#inside');});
check(()=>{const p=C.preset(new URL(C.shareLink({...settings,target:'https://example.com/test?q=a&v=b#c'})).hash,base);assert.equal(p.target,'https://example.com/test?q=a&v=b#c');});
check(()=>assert.throws(()=>C.shareLink({...settings,base:current}),/尚未/));
for(const bad of ['javascript:alert(1)','file:///C:/secret','https://user:pass@example.com/'])check(()=>assert.throws(()=>C.preset('#url='+encodeURIComponent(bad),base)));
for(const value of ['localhost','x.localhost','127.3.2.1','[::1]'])check(()=>assert.equal(C.loopback(value),true));
for(const value of ['192.168.1.50','192.168.1.3','localhost.example.com'])check(()=>assert.equal(C.loopback(value),false));
check(()=>{const p=C.preset('#device=missing&fold=unknown&mode=bad&zoom=999&w=200&h=300',base);assert.equal(p.device.id,'puraxmax');assert.equal(p.fold,'open');assert.equal(p.custom,null);assert.equal(p.mode,'auto');assert.equal(p.zoom,'fit');});
check(()=>assert.equal(C.preset('#w=240.5&h=900',base).custom,null));
check(()=>assert.equal(C.preset('#w=2561&h=900',base).custom,null));
console.log(`${count} sharing, loopback handling, settings restoration and unsafe-link checks passed.`);

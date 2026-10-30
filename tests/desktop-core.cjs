const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{},URL,URLSearchParams};vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../devices.js'),'utf8'),context);const C=context.window.DevicePreview,base='http://127.0.0.1:8780/';
const {validUrl,geometry,errorMessage}=require('../desktop/common.cjs');let n=0;function test(fn){fn();n++;}
test(()=>{const p=C.preset('',base);assert.equal(p.device.id,'puraxmax');assert.equal(p.fold,'open');});
for(const brand of ['华为','Apple','小米','vivo','OPPO','荣耀','三星','一加'])test(()=>assert.ok(C.devices.some(d=>d.brand===brand)));
for(const raw of ['localhost:8083?mentorId=3&date=2026-10-30','127.0.0.1:8767#form','dev.local:3000?view=week'])test(()=>assert.ok(C.normalize(raw,base).startsWith('http://')));
for(const raw of ['javascript:alert(1)','file:///C:/private.txt','https://name:secret@example.com/','data:text/html,hello'])test(()=>assert.throws(()=>validUrl(raw)));
test(()=>assert.throws(()=>validUrl('file:///C:/demo.html',new Set(['file:///C:/demo.html'])),/本地 HTML/));
test(()=>assert.equal(validUrl('https://example.com/a#b'),'https://example.com/a#b'));
const fixture={rect:{x:100,y:120,width:430.5,height:304.5},clip:{x:50,y:80,width:700,height:500},width:861,height:609,scale:.5,radius:10,visible:true};
test(()=>{const g=geometry(fixture,{width:1000,height:800});assert.equal(g.clip.x,100);assert.equal(g.clip.width,431);assert.equal(g.view.width,431);assert.equal(g.width,861);assert.equal(g.scale,.5);});
test(()=>assert.equal(geometry({...fixture,visible:false},{width:1000,height:800}).visible,false));
test(()=>{const g=geometry({...fixture,rect:{x:-50,y:50,width:500,height:400}},{width:1000,height:800});assert.equal(g.clip.x,50);assert.equal(g.view.x,-100);assert.equal(g.clip.width,400);});
test(()=>assert.equal(geometry({...fixture,width:NaN},{width:1000,height:800}),null));
test(()=>assert.equal(geometry({...fixture,width:5000},{width:1000,height:800}),null));
test(()=>assert.match(errorMessage(-102),/没有启动/));test(()=>assert.match(errorMessage(-105),/域名/));test(()=>assert.match(errorMessage(-202),/证书/));test(()=>assert.match(errorMessage(-106),/网络/));
for(const file of ['studio.js','devices.js','desktop/main.cjs','desktop/common.cjs','desktop/preload.cjs','desktop/build.cjs'])new vm.Script(fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8'));
console.log(n+' desktop URL, default profile, brand, clipping and failure-classification checks passed.');

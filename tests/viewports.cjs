const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx={window:{},URL};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'devices.js'),'utf8'),ctx);const C=ctx.window.DevicePreview,base='http://127.0.0.1:8780/';let count=0;
function check(fn){fn();count++;}
const fold=C.devices.find(d=>d.id==='puraxmax');
check(()=>assert.deepEqual(Array.from(C.screen(fold,'closed').pixels),[1264,1848]));
check(()=>{const s=C.screen(fold,'open');assert.equal(s.width,861);assert.equal(s.height,609);});
check(()=>{const s=C.screen(fold,'closed',true);assert.equal(s.width,616);assert.equal(s.height,421);});
check(()=>{const s=C.screen(fold,'open',false,[700,800]);assert.equal(s.width,700);assert.equal(s.height,800);});
check(()=>{const s=C.screen(fold,'open',true,[700,800]);assert.equal(s.width,800);assert.equal(s.height,700);});
for(const d of C.devices)for(const [state,spec] of Object.entries(d.screens)){
  check(()=>{const s=C.screen(d,state);assert.equal(s.width,spec.viewport[0]);assert.equal(s.height,spec.viewport[1]);if(spec.pixels){assert.equal(s.width,Math.round(spec.pixels[0]/3));assert.equal(s.height,Math.round(spec.pixels[1]/3));}});
}
for(const [raw,expected] of [
  ['localhost:8766','http://localhost:8766/'],['127.0.0.1:8767/foo#composeDialog','http://127.0.0.1:8767/foo#composeDialog'],
  ['192.168.1.50:8767','http://192.168.1.50:8767/'],['dev.local:8000/demo','http://dev.local:8000/demo'],
  ['[::1]:8766','http://[::1]:8766/'],['example.com/path','https://example.com/path'],
  ['/sample/','http://127.0.0.1:8780/sample/'],['[预览](https://example.com/demo)','https://example.com/demo'],
  ['这是预览 https://example.com/demo 。','https://example.com/demo']
])check(()=>assert.equal(C.normalize(raw,base),expected));
for(const raw of ['', 'javascript:alert(1)','data:text/html,hello','file:///C:/secret.txt','https://name:secret@example.com','http://127.0.0.1:8780/','/index.html','https://a.test https://b.test'])check(()=>assert.throws(()=>C.normalize(raw,base)));
check(()=>assert.equal(C.fit(420,948,1200,800)<1,true));
check(()=>assert.equal(C.fit(420,948,1600,1400),1));
for(const file of ['studio.js','devices.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'));
console.log(`${count} viewport, fold, rotation, zoom and URL validation checks passed.`);

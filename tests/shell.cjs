const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),ctx={window:{},URL};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'devices.js'),'utf8'),ctx);const C=ctx.window.DevicePreview;
let checks=0;function test(fn){fn();checks++;}
for(const d of C.devices)for(const fold of Object.keys(d.screens)){
  const normal=C.hardware(d,fold),rotated=C.hardware(d,fold,true),size=C.screen(d,fold),turned=C.screen(d,fold,true);
  test(()=>assert.equal(rotated.length,normal.length));
  normal.forEach((key,i)=>test(()=>{assert.equal(rotated[i].side,key.side==='right'?'top':'bottom');assert.equal(rotated[i].position,key.position);assert.equal(rotated[i].length,key.length);const before=(size.height+18)*key.length,after=(turned.width+18)*rotated[i].length;assert.equal(after,before);assert(key.position>key.length/2&&key.position<1-key.length/2);}));
}
test(()=>assert.equal(C.hardware(C.devices.find(d=>d.id==='custom'),'normal').length,0));
for(const id of ['iphone17','iphone17promax'])test(()=>{const keys=C.hardware(C.devices.find(d=>d.id===id),'normal');assert.deepEqual(Array.from(keys.filter(k=>k.side==='left'),k=>k.name),['action','volume-up','volume-down']);assert.deepEqual(Array.from(keys.filter(k=>k.side==='right'),k=>k.name),['power','camera']);});
for(const id of ['oneplus13','oppofindx8'])test(()=>assert(C.hardware(C.devices.find(d=>d.id===id),'normal').some(k=>k.name==='alert'&&k.side==='left')));
const main=fs.readFileSync(path.join(root,'desktop/main.cjs'),'utf8'),start=main.indexOf('function layout('),end=main.indexOf('function configureContents(',start);
const {geometry}=require(path.join(root,'desktop/common.cjs'));let calls=[];const clip={setBounds:b=>calls.push(['clipBounds',b]),setBorderRadius:r=>calls.push(['clipRadius',r]),setVisible:v=>calls.push(['visible',v])};const contents={isDevToolsOpened:()=>false,debugger:{isAttached:()=>true,sendCommand:async(method,params)=>calls.push(['metrics',method,params])}};
const screenSurface={setBounds:b=>calls.push(['screenBounds',b]),setBorderRadius:r=>calls.push(['screenRadius',r])};
const context={geometry,screenSurface,win:{getContentBounds:()=>({width:1400,height:920}),webContents:{getZoomFactor:()=>1}},clip,view:{setBounds:b=>calls.push(['viewBounds',b]),setBorderRadius:r=>calls.push(['viewRadius',r]),webContents:contents},currentGeometry:null,lastGeometry:'',pageReady:true,metricsTimer:null,setTimeout:()=>1,clearTimeout:()=>{},report:()=>{},send:()=>{}};vm.createContext(context);vm.runInContext(main.slice(start,end),context);
const fixture={rect:{x:100.6,y:120.6,width:430.5,height:304.5},clip:{x:50,y:80,width:700,height:500},width:861,height:609,scale:.5,radius:10,visible:true};
test(()=>{context.layout(fixture);assert.equal(calls.find(c=>c[0]==='screenRadius')[1],10);});
test(()=>{const c=calls.find(c=>c[0]==='metrics');assert.equal(c[1],'Emulation.setDeviceMetricsOverride');const p=c[2];assert.equal(p.width,861);assert.equal(p.height,609);assert.equal(p.scale,.5);assert.equal(p.mobile,true);assert.equal(p.dontSetVisibleSize,true);assert.equal(p.screenWidth,861);});
test(()=>{calls=[];context.layout({...fixture,rect:{...fixture.rect,x:-50}});assert.equal(calls.find(c=>c[0]==='screenBounds')[1].x,-100);assert.equal(calls.find(c=>c[0]==='viewBounds')[1].x,0);assert.equal(calls.find(c=>c[0]==='screenRadius')[1],10);});
test(()=>{assert(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('standaloneButton'));assert(!fs.readFileSync(path.join(root,'studio.js'),'utf8').includes('standaloneButton'));assert(!main.includes('handle(\'standalone\''));});
console.log(`${checks} shell rotation, hardware, mobile viewport and corner-clipping regression checks passed.`);

const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ctx={window:{},URL,URLSearchParams};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../devices.js'),'utf8'),ctx);const C=ctx.window.DevicePreview;
const {geometry}=require('../desktop/common.cjs');let count=0;function check(fn){fn();count++;}
for(const d of C.devices)for(const fold of Object.keys(d.screens))for(const rotated of [false,true]){
  check(()=>{
    const screen=C.screen(d,fold,rotated),p=C.systemChrome(d,fold,rotated),i=p.insets;
    assert.equal(p.content.width+i.left+i.right,screen.width);assert.equal(p.content.height+i.top+i.bottom,screen.height);
    assert(p.content.width>=100&&p.content.height>=100);
    if(p.cutout){const c=p.cutout;assert(c.x-c.width/2>=0&&c.x+c.width/2<=screen.width);assert(c.y-c.height/2>=0&&c.y+c.height/2<=screen.height);
      assert(c.y+c.height/2<=i.top||c.x+c.width/2<=i.left,'Cutout must not cover the webpage');}
    else assert.equal(d.id,'custom');
  });
  check(()=>{const hidden=C.systemChrome(d,fold,rotated,null,'none'),screen=C.screen(d,fold,rotated);assert.equal(hidden.cutout,null);assert.equal(hidden.barHeight,0);assert.equal(hidden.content.width,screen.width);assert.equal(hidden.content.height,screen.height);});
}
for(const d of C.devices)check(()=>{const fold=d.screens.open?'open':'normal';assert.deepEqual(C.systemChrome(d,fold,false,null,'dark'),C.systemChrome(d,fold,false,null,'light'));});
check(()=>{const d=C.devices[0],open=C.systemChrome(d,'open'),closed=C.systemChrome(d,'closed');assert.equal(open.cutout.x,836);assert.equal(closed.cutout.x,210.5);assert.equal(open.content.height,577);});
check(()=>{const d=C.devices.find(d=>d.id==='iphone17'),p=C.systemChrome(d,'normal');assert.equal(p.content.height,812);assert.equal(p.cutout.width,116);assert.equal(p.barHeight,62);});
check(()=>{const d=C.devices.find(d=>d.id==='iphone17'),p=C.systemChrome(d,'normal',true);assert.equal(p.barHeight,0);assert.equal(p.cutout.height,116);assert.equal(p.content.width,750);assert.equal(p.insets.left,62);assert.equal(p.insets.right,62);});
check(()=>{const d=C.devices.find(d=>d.id==='honormagic7pro');assert.equal(C.systemChrome(d,'normal').cutout.width,48);});
check(()=>{const d=C.devices.find(d=>d.id==='iphone17'),p=C.systemChrome(d,'normal',true,[240,240]);assert.equal(p.content.width,116);});
const fixture={rect:{x:100,y:120,width:430.5,height:304.5},contentRect:{x:100,y:136,width:430.5,height:288.5},clip:{x:50,y:80,width:700,height:500},width:861,height:577,screenWidth:861,screenHeight:609,scale:.5,radius:10,visible:true};
check(()=>{const g=geometry(fixture,{width:1000,height:800});assert.equal(g.content.y,16);assert.equal(g.content.height,289);assert.equal(g.screenHeight,609);assert.equal(g.height,577);});
check(()=>{const g=geometry(fixture,{width:1000,height:800},1.5);assert.equal(g.content.y,24);assert.equal(g.content.width,646);assert.equal(g.height,577);assert.equal(g.scale,.75);});
check(()=>{const g=geometry({...fixture,rect:{...fixture.rect,y:-80},contentRect:{...fixture.contentRect,y:-64}},{width:1000,height:800});assert.equal(g.view.y,-160);assert.equal(g.content.y,16);});
check(()=>assert.equal(geometry({...fixture,contentRect:{...fixture.contentRect,y:110}},{width:1000,height:800}),null));
check(()=>assert.equal(geometry({...fixture,contentRect:{...fixture.contentRect,width:NaN}},{width:1000,height:800}),null));
const base='http://192.168.1.50:8780/';
check(()=>assert.equal(C.preset('',base).chrome,'light'));
for(const chrome of ['light','dark','none'])check(()=>{const url=C.shareLink({base,current:base,target:base+'sample/',device:'iphone17',fold:'normal',rotated:true,mode:'embed',zoom:'fit',chrome});assert.equal(C.preset(new URL(url).hash,base).chrome,chrome);});
check(()=>assert.equal(C.preset('#chrome=unexpected',base).chrome,'light'));
console.log(count+' system status bar, safe content, fold/rotation and share round-trip checks passed.');

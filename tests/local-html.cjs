'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),{pathToFileURL}=require('node:url');
const {LocalPreview,htmlCode}=require('../desktop/local-preview.cjs');
let count=0;async function test(fn){await fn();count++;}
function request(url,options={}){return new Promise((resolve,reject)=>{const req=http.request(url,options,res=>{let body='';res.setEncoding('utf8');res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('error',reject);req.end();});}
(async()=>{
  const base=path.resolve(__dirname,'../work/test-local-fixtures'),root=path.join(base,'project');await fs.mkdir(root,{recursive:true});await fs.mkdir(path.join(root,'next'),{recursive:true});
  const html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>本地 HTML 联调示例</title><link rel="stylesheet" href="./style.css"><main><small>LOCAL HTML / 本地联调</small><h1>AI 给的 HTML，直接看。</h1><p id="resources">模块脚本正在载入…</p><img src="./mark.svg" width="90" height="90" alt="本地素材"><p><input aria-label="本地输入保留检查" placeholder="输入后切换折叠屏"></p><button id="counter">交互检查：0</button><p id="size"></p><a href="./next/">下一页</a></main><script type="module" src="./app.js"></script></html>';
  await fs.writeFile(path.join(root,'课堂.html'),html);await fs.writeFile(path.join(root,'index.html'),html);
  await fs.writeFile(path.join(root,'style.css'),'body{margin:0;background:#f2f7e8;color:#283c20;font:16px/1.7 system-ui;padding:28px}main{padding:25px;border:1px solid #dce9cb;border-radius:18px;background:white}h1{font-size:32px;line-height:1.2}small{color:#728858}button{padding:12px 20px;background:#cce993;border:0;border-radius:9px}input{padding:12px;border:1px solid #bbcca6;border-radius:9px;width:85%}img{float:right}@media(max-width:500px){h1{font-size:23px}body{padding:16px}main{padding:20px}}');
  await fs.writeFile(path.join(root,'app.js'),'import {text} from "/text.mjs"; const data=await fetch("./data.json").then(r=>r.json()); document.querySelector("#resources").textContent=text+data.label;let n=0;document.querySelector("#counter").onclick=()=>document.querySelector("#counter").textContent="交互检查："+(++n);const show=()=>document.querySelector("#size").textContent="视口 "+innerWidth+" × "+innerHeight;show();addEventListener("resize",show);');
  await fs.writeFile(path.join(root,'text.mjs'),'export const text="样式、模块脚本、";');await fs.writeFile(path.join(root,'data.json'),'{"label":"数据均已载入"}');
  await fs.writeFile(path.join(root,'mark.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 90"><rect width="90" height="90" rx="23" fill="#d4ef9e"/><circle cx="45" cy="45" r="23" fill="#779e43"/></svg>');
  await fs.writeFile(path.join(root,'next/index.html'),'<meta charset="utf-8"><h1>本地第二页，导航正常</h1><a href="../课堂.html">返回示例</a>');
  await fs.writeFile(path.join(root,'.env'),'not-to-be-served');await fs.writeFile(path.join(root,'source.py'),'private source');await fs.writeFile(path.join(base,'private.json'),'outside');
  try{await fs.symlink(base,path.join(root,'outside'),'junction');}catch(error){if(error.code!=='EEXIST')throw error;}
  const local=new LocalPreview();
  try{
    const info=await local.openPath(path.join(root,'课堂.html')),origin=new URL(info.url).origin;
    await test(async()=>assert.equal((await request(info.url)).status,200));
    await test(()=>assert.ok(info.url.includes('%E8%AF%BE%E5%A0%82.html')));
    await test(async()=>assert.equal((await local.openPath(pathToFileURL(path.join(root,'课堂.html')).href)).url,info.url));
    for(const file of ['style.css','app.js','text.mjs','data.json','mark.svg'])await test(async()=>assert.equal((await request(origin+'/'+file)).status,200));
    await test(async()=>assert.match((await request(origin+'/text.mjs')).headers['content-type'],/javascript/));
    await test(async()=>assert.equal((await request(info.url+'?x=1')).status,200));
    await test(async()=>assert.match((await request(origin+'/next/')).body,/导航正常/));
    await test(async()=>{const r=await request(origin+'/next?x=1');assert.equal(r.status,302);assert.equal(r.headers.location,'/next/?x=1');});
    await test(async()=>assert.equal((await request(origin+'/none.png')).status,404));
    for(const file of ['.env','source.py','outside/private.json','..%5cprivate.json'])await test(async()=>assert.equal((await request(origin+'/'+file)).status,403));
    await test(async()=>assert.equal((await request(origin+'/outside')).status,403));
    await test(async()=>assert.equal((await request(info.url,{method:'POST'})).status,405));
    await test(async()=>assert.equal((await request(info.url,{headers:{Host:'evil.example'}})).status,403));
    for(const site of ['cross-site','same-site'])await test(async()=>assert.equal((await request(info.url,{headers:{'Sec-Fetch-Site':site}})).status,403));
    await test(async()=>assert.equal((await request(info.url,{method:'HEAD'})).body,''));
    await test(async()=>{await fs.writeFile(path.join(root,'live.css'),'before');assert.equal((await request(origin+'/live.css')).body,'before');await fs.writeFile(path.join(root,'live.css'),'after');assert.equal((await request(origin+'/live.css')).body,'after');});
    await test(async()=>assert.equal((await request(origin+'/')).headers['cache-control'],'no-store'));
    await test(()=>assert.equal(local.describe(info.url+'#anchor').path,path.join(root,'课堂.html')));
    await test(()=>assert.equal(local.describe('https://example.com/'),null));
    const code=await local.openCode('```html\n<h1>粘贴预览</h1>\n```');
    await test(()=>assert.notEqual(new URL(code.url).origin,origin));
    await test(async()=>assert.equal((await request(code.url)).body,'<h1>粘贴预览</h1>'));
    await test(async()=>assert.equal((await request(new URL('missing.css',code.url))).status,404));
    await test(()=>assert.throws(()=>htmlCode('  '),/还没有/));
    await test(async()=>assert.rejects(()=>local.openPath(path.join(root,'source.py')),/html/));
    await test(async()=>assert.rejects(()=>local.openPath(path.join(root,'missing.html')),/找不到/));
    console.log(count+' local HTML import, asset, module, navigation, refresh and boundary checks passed.');
    console.log('GUI_FIXTURE='+path.join(root,'课堂.html'));
  }finally{local.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

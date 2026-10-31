'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const project=path.resolve(__dirname,'..'),workspace=path.basename(path.dirname(project))==='outputs'?path.resolve(project,'../..'):project;
const build=path.join(workspace,'work','yingping-desktop-build'),out=path.join(workspace,'outputs','映屏桌面版');
fs.mkdirSync(build,{recursive:true});fs.mkdirSync(path.join(build,'public'),{recursive:true});
for(const file of ['main.cjs','preload.cjs','common.cjs','local-preview.cjs','package.json','package-lock.json'])if(fs.existsSync(path.join(__dirname,file)))fs.copyFileSync(path.join(__dirname,file),path.join(build,file));
for(const file of ['index.html','studio.css','studio.js','devices.js','icons.js','demo.html','repair.html','preview.ico','Lucide-LICENSE.txt'])fs.copyFileSync(path.join(project,file),path.join(build,'public',file));
const npm=process.platform==='win32'?'npm.cmd':'npm';
function run(args){const result=spawnSync(npm,args,{cwd:build,stdio:'inherit',shell:process.platform==='win32'});if(result.status!==0)throw Error('依赖准备失败，请检查 Node.js 和网络。');}
if(!fs.existsSync(path.join(build,'node_modules','@electron','packager')))run(['install','--no-audit','--no-fund']);
if(!fs.existsSync(path.join(build,'node_modules','electron','dist','electron.exe'))){const result=spawnSync(process.execPath,[path.join(build,'node_modules','electron','install.js')],{cwd:build,stdio:'inherit'});if(result.status!==0)throw Error('Electron 运行时下载失败。');}
(async()=>{
  const imported=await import(require('node:url').pathToFileURL(path.join(build,'node_modules','@electron','packager','dist','index.js')).href);
  const packager=imported.packager||imported.default||imported;
  const checksums=require(path.join(build,'node_modules','electron','checksums.json'));
  const locations=await packager({dir:build,out,name:'映屏',executableName:'映屏',platform:'win32',arch:'x64',electronVersion:'45.1.0',download:{checksums},icon:path.join(build,'public','preview.ico'),ignore:/(^|[\\/])node_modules([\\/]|$)/,asar:true,overwrite:true,prune:true});
  const guide=fs.readFileSync(path.join(project,'README.md'),'utf8').replace('(LICENSE)','(映屏-LICENSE.txt)');
  fs.writeFileSync(path.join(locations[0],'README.md'),guide,'utf8');
  for(const [source,target] of [['LICENSE','映屏-LICENSE.txt'],['THIRD_PARTY_NOTICES.md','THIRD_PARTY_NOTICES.md'],['Lucide-LICENSE.txt','Lucide-LICENSE.txt']])fs.copyFileSync(path.join(project,source),path.join(locations[0],target));
  fs.copyFileSync(path.join(__dirname,'创建桌面快捷方式.vbs'),path.join(locations[0],'创建桌面快捷方式.vbs'));
  console.log('DESKTOP_READY='+locations[0]);
})().catch(error=>{console.error(error);process.exitCode=1;});

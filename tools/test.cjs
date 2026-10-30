const {spawnSync}=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const file of ['viewports.cjs','browser-modes.cjs','sharing.cjs','desktop-core.cjs','shell.cjs','local-html.cjs','adversarial.cjs']){
 const result=spawnSync(process.execPath,[path.join(root,'tests',file)],{cwd:root,stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
}
if(!process.argv.includes('--node-only')){
 const configured=process.env.PYTHON;let runtime=configured||'python',prefix=[];
 if(!configured&&spawnSync(runtime,['--version']).error){runtime='py';prefix=['-3'];}
 for(const file of ['web_server.py','startup.py']){
 const result=spawnSync(runtime,[...prefix,'-X','utf8','-B',path.join(root,'tests',file)],{cwd:root,stdio:'inherit'});
 if(result.error){console.error('网页版测试需要 Python 3。只检查 Node.js 部分可运行 npm run test:node。');process.exit(1);}if(result.status!==0)process.exit(result.status||1);
 }
}
console.log('All requested checks passed.');

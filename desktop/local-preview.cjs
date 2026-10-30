'use strict';
const fs=require('node:fs/promises'),{createReadStream}=require('node:fs'),path=require('node:path'),{createServer}=require('node:http'),{fileURLToPath}=require('node:url');
const TYPES={'.html':'text/html','.htm':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.map':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.mp4':'video/mp4','.webm':'video/webm','.wasm':'application/wasm','.txt':'text/plain','.csv':'text/csv'};
const MAX_HTML=20*1024*1024;
function htmlCode(raw){
  if(typeof raw!=='string')throw Error('请粘贴 HTML 代码。');
  const code=raw.trim().replace(/^```(?:html)?\s*\r?\n([\s\S]*?)\r?\n```$/i,'$1');
  if(!code.trim())throw Error('还没有 HTML 内容。');
  if(Buffer.byteLength(code)>MAX_HTML)throw Error('HTML 超过 20 MB，请精简后再预览。');
  return code;
}
function localPath(raw){
  if(typeof raw!=='string')throw Error('请选择 HTML 文件。');
  let file=raw.trim().replace(/^"([\s\S]*)"$/,'$1');
  if(/^file:/i.test(file))file=fileURLToPath(file);
  if(!path.isAbsolute(file)||file.startsWith('\\\\')||!/^\.html?$/i.test(path.extname(file)))throw Error('请选择本机的 .html 或 .htm 文件。');
  return file;
}
function within(root,file){const relative=path.relative(root,file);return !relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);}
function visibleAsset(root,file){return within(root,file)&&!path.relative(root,file).split(path.sep).some(part=>part.startsWith('.'));}
class LocalPreview{
  constructor(){this.projects=[];}
  async openPath(raw){
    let entry;try{entry=await fs.realpath(localPath(raw));}catch(error){if(error.code==='ENOENT')throw Error('找不到这个 HTML 文件，请检查路径或重新选择。');throw error;}
    const stat=await fs.stat(entry);if(!stat.isFile()||stat.size>MAX_HTML)throw Error('请选择不超过 20 MB 的 HTML 文件。');
    const existing=this.projects.find(p=>p.entry===entry);if(existing)return this.info(existing);
    return this.serve({kind:'file',entry,root:path.dirname(entry),name:path.basename(entry)});
  }
  async openCode(raw){const code=htmlCode(raw),existing=this.projects.find(p=>p.kind==='code');if(existing){existing.code=code;return this.info(existing);}return this.serve({kind:'code',code,name:'粘贴的 HTML',filename:'index.html'});}
  info(project){return {kind:project.kind,name:project.name,path:project.entry||'',url:project.origin+'/'+encodeURIComponent(project.filename||path.basename(project.entry))};}
  describe(url){const project=this.projects.find(p=>url.startsWith(p.origin+'/'));return project?this.info(project):null;}
  async serve(project){
    const server=createServer(async(req,res)=>{
      const reply=(code,text)=>{res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'});res.end(text);};
      if(req.headers.host!=='127.0.0.1:'+server.address().port)return reply(403,'Host not allowed');
      if(req.headers['sec-fetch-site']&&!['none','same-origin'].includes(req.headers['sec-fetch-site']))return reply(403,'Open this project through the local HTML entry');
      if(req.method!=='GET'&&req.method!=='HEAD')return reply(405,'Read-only preview');
      let pathname,requested;try{requested=new URL(req.url,'http://localhost');pathname=decodeURIComponent(requested.pathname);}catch{return reply(400,'Invalid path');}
      if(pathname.includes('\0'))return reply(400,'Invalid path');
      if(project.kind==='code'){
        if(!['/','/index.html'].includes(pathname))return reply(404,'此资源未随 HTML 导入；有配套素材时请打开原 HTML 文件。');
        const body=Buffer.from(project.code);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':body.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(req.method==='HEAD'?undefined:body);
      }
      const candidate=path.resolve(project.root,'.'+pathname);
      if(!within(project.root,candidate)||pathname.split(/[\\/]/).some(part=>part.startsWith('.')&&part!=='.'))return reply(403,'Outside the selected HTML folder');
      try{
        let file=await fs.realpath(candidate);if(!visibleAsset(project.root,file))return reply(403,'Outside the visible HTML folder');
        let stat=await fs.stat(file);
        if(stat.isDirectory()){
          if(!pathname.endsWith('/')){res.writeHead(302,{'Location':requested.pathname+'/'+requested.search,'Cache-Control':'no-store'});return res.end();}
          file=await fs.realpath(path.join(file,'index.html'));stat=await fs.stat(file);
        }
        if(!visibleAsset(project.root,file))return reply(403,'Outside the visible HTML folder');
        const type=TYPES[path.extname(file).toLowerCase()];if(!stat.isFile()||!type)return reply(403,'Only web assets are served');
        res.writeHead(200,{'Content-Type':type,'Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
        if(req.method==='HEAD')return res.end();
        const stream=createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
      }catch{return reply(404,'资源不存在，请保留 HTML 和配套素材的目录结构。');}
    });
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    project.server=server;project.origin='http://127.0.0.1:'+server.address().port;this.projects.push(project);return this.info(project);
  }
  close(){for(const p of this.projects){p.server.close();p.server.closeAllConnections();}this.projects=[];}
}
module.exports={LocalPreview,htmlCode,localPath,within};

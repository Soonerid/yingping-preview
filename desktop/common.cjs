'use strict';
function validUrl(raw){
  const url=new URL(raw);
  if(url.username||url.password)throw Error('网址中不能包含账号或密码。');
  if(!['http:','https:'].includes(url.protocol))throw Error('请使用网页地址，或通过“本地 HTML”入口导入文件。');
  return url.href;
}
function geometry(data,host,zoom=1){
  if(!data||![data.width,data.height,data.scale].every(Number.isFinite)||data.width<100||data.width>2560||data.height<100||data.height>2560)return null;
  const r=data.rect,c=data.clip,content=data.contentRect||r;
  if(!r||!c||![r.x,r.y,r.width,r.height,c.x,c.y,c.width,c.height].every(Number.isFinite))return null;
  if(!content||![content.x,content.y,content.width,content.height].every(Number.isFinite)||content.width<=0||content.height<=0||content.x<r.x-.1||content.y<r.y-.1||content.x+content.width>r.x+r.width+.1||content.y+content.height>r.y+r.height+.1)return null;
  const x=Math.max(0,Math.round(Math.max(r.x,c.x)*zoom)),y=Math.max(0,Math.round(Math.max(r.y,c.y)*zoom));
  const right=Math.min(host.width,Math.round(Math.min(r.x+r.width,c.x+c.width)*zoom)),bottom=Math.min(host.height,Math.round(Math.min(r.y+r.height,c.y+c.height)*zoom));
  return {visible:Boolean(data.visible)&&right>x&&bottom>y,clip:{x,y,width:Math.max(0,right-x),height:Math.max(0,bottom-y)},view:{x:Math.round(r.x*zoom)-x,y:Math.round(r.y*zoom)-y,width:Math.max(1,Math.round(r.width*zoom)),height:Math.max(1,Math.round(r.height*zoom))},content:{x:Math.round((content.x-r.x)*zoom),y:Math.round((content.y-r.y)*zoom),width:Math.max(1,Math.round(content.width*zoom)),height:Math.max(1,Math.round(content.height*zoom))},width:Math.round(data.width),height:Math.round(data.height),screenWidth:Number.isFinite(data.screenWidth)?Math.round(data.screenWidth):Math.round(data.width),screenHeight:Number.isFinite(data.screenHeight)?Math.round(data.screenHeight):Math.round(data.height),scale:Math.max(.1,Math.min(2,data.scale*zoom)),radius:Math.max(0,Math.min(60,Math.round((data.radius||0)*zoom)))};
}
function errorMessage(code,description=''){
  if(code===-102)return '目标服务没有启动或端口不对。请先启动网页项目，再检查地址。';
  if(code===-105)return '找不到这个域名，请检查拼写、网络或 DNS。';
  if(code===-106)return '当前没有网络连接，请联网后重新加载。';
  if(code===-118||code===-7)return '连接超时，请检查网络、校园网登录或目标服务状态。';
  if(code<=-200&&code>=-299)return '网站证书未通过验证。请在普通浏览器中检查证书；映屏不会忽略证书错误。';
  return '网页加载失败：'+(description||'网络或网站暂不可用')+'（'+code+'）。可在普通浏览器中进一步检查。';
}
module.exports={validUrl,geometry,errorMessage};

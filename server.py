"""Local viewport viewer. Never proxies external sites or opens private app APIs."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
import argparse
import json
import mimetypes
import socket
import ipaddress

ROOT=Path(__file__).resolve().parent
ALLOWED={'index.html','studio.css','studio.js','devices.js','icons.js','demo.html'}
ARCHIVE=ROOT.parent/'手机预览台.zip'


def lan_urls(host,port):
    if host in ('127.0.0.1','localhost','::1'):return []
    try:addresses={item[4][0] for item in socket.getaddrinfo(socket.gethostname(),None,socket.AF_INET)} if host=='0.0.0.0' else {host}
    except OSError:return []
    networks=[ipaddress.ip_network(value) for value in ('10.0.0.0/8','172.16.0.0/12','192.168.0.0/16')]
    return [f'http://{address}:{port}/' for address in sorted(addresses) if any(ipaddress.ip_address(address) in network for network in networks)]


class PreviewServer(ThreadingHTTPServer):
    def server_bind(self):
        if hasattr(socket,'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1)
            self.allow_reuse_address=False
        super().server_bind()


class Viewer(BaseHTTPRequestHandler):
    def log_message(self,*_):
        pass

    def reply(self,status,data,mime='application/json; charset=utf-8'):
        self.send_response(status)
        for key,value in {'Content-Type':mime,'Content-Length':str(len(data)),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"frame-ancestors 'self'"}.items():self.send_header(key,value)
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path=unquote(urlsplit(self.path).path)
        if path=='/api/preview-info':
            host,port=self.server.server_address[:2]
            return self.reply(200,json.dumps({'bind':host,'lan_urls':lan_urls(host,port),'download_ready':ARCHIVE.is_file()}).encode())
        if path=='/repair':
            return self.reply(200,(ROOT/'repair.html').read_bytes(),'text/html; charset=utf-8')
        if path=='/sw.js':
            # Retire the booking sample's old root-scoped worker on this origin only.
            script=b"self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('gm-shell-')).map(k=>caches.delete(k)))).then(()=>self.registration.unregister())));"
            return self.reply(200,script,'text/javascript; charset=utf-8')
        if path=='/download':
            if not ARCHIVE.is_file():return self.reply(404,b'{}')
            return self.reply(200,ARCHIVE.read_bytes(),'application/zip')
        if path.startswith('/api/'):return self.reply(401,b'{"error":"Preview viewer has no private application API"}')
        if path in ('/sample/','/sample'):
            return self.reply(200,(ROOT/'demo.html').read_bytes(),'text/html; charset=utf-8')
        name=path.lstrip('/') or 'index.html'
        root=ROOT if name in ALLOWED else None
        if root is None or not (root/name).is_file():return self.reply(404,b'{}')
        mime={'.css':'text/css','.js':'text/javascript','.html':'text/html'}.get(Path(name).suffix) or mimetypes.guess_type(name)[0] or 'application/octet-stream'
        self.reply(200,(root/name).read_bytes(),mime+('; charset=utf-8' if Path(name).suffix in ('.html','.css','.js') else ''))

    def do_POST(self):
        self.close_connection=True
        self.reply(405,b'{"error":"No database writes in the viewer"}')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--bind',default='127.0.0.1')
    parser.add_argument('--port',type=int,default=8780)
    parser.add_argument('--open',action='store_true')
    args=parser.parse_args()
    try:
        server=PreviewServer((args.bind,args.port),Viewer)
    except OSError:
        if args.open:
            from urllib.request import build_opener,ProxyHandler
            try:
                with build_opener(ProxyHandler({})).open(f'http://127.0.0.1:{args.port}/',timeout=2) as response:
                    html=response.read(12000)
                    existing='映屏 · 手机与折叠屏预览台'.encode() in html or '屏幕预览 · 手机与折叠屏'.encode() in html
            except OSError:
                existing=False
            if existing:
                if args.bind=='0.0.0.0':
                    try:
                        with build_opener(ProxyHandler({})).open(f'http://127.0.0.1:{args.port}/api/preview-info',timeout=2) as response:shared=bool(json.load(response).get('lan_urls'))
                    except (OSError,ValueError):shared=False
                    if not shared:parser.error('这个端口上的预览台只供本机使用。请关闭原来的启动窗口，再运行“局域网共享启动.cmd”。')
                import webbrowser
                webbrowser.open(f'http://127.0.0.1:{args.port}/')
                raise SystemExit(0)
        parser.error('端口已占用或地址不可用，请换一个 --port，或检查 --bind 地址。')
    print(f'Preview studio: http://{args.bind}:{args.port}/',flush=True)
    for address in lan_urls(args.bind,args.port):print(f'LAN: {address}',flush=True)
    if args.open:
        import webbrowser
        webbrowser.open(f'http://127.0.0.1:{args.port}/')
    server.serve_forever()

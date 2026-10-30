"""Start the correct local viewer before opening it; safe to launch repeatedly."""
from pathlib import Path
from urllib.request import build_opener,ProxyHandler
import argparse
import json
import socket
import subprocess
import sys
import time
import webbrowser

ROOT=Path(__file__).resolve().parent
ASSETS=('index.html','studio.css','devices.js','icons.js','studio.js')


def healthy(port,shared=False):
    http=build_opener(ProxyHandler({}))
    try:
        for name in ASSETS:
            with http.open(f'http://127.0.0.1:{port}/'+('' if name=='index.html' else name),timeout=.8) as response:
                if response.read()!=(ROOT/name).read_bytes():return False
                if name.endswith('.css') and response.headers.get_content_type()!='text/css':return False
                if name.endswith('.js') and response.headers.get_content_type() not in ('text/javascript','application/javascript'):return False
        with http.open(f'http://127.0.0.1:{port}/api/preview-info',timeout=.8) as response:info=json.load(response)
        return not shared or info.get('bind')=='0.0.0.0'
    except (OSError,ValueError):return False


def ensure_started(bind='127.0.0.1',preferred=8780):
    for port in range(preferred,preferred+10):
        if healthy(port,bind=='0.0.0.0'):return f'http://127.0.0.1:{port}/repair'
        with socket.socket() as probe:
            probe.settimeout(.25)
            if probe.connect_ex(('127.0.0.1',port))==0:continue
        flags=subprocess.CREATE_NO_WINDOW if sys.platform=='win32' else 0
        process=subprocess.Popen([sys.executable,'-X','utf8','-B',str(ROOT/'server.py'),'--bind',bind,'--port',str(port)],cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=flags,close_fds=True)
        deadline=time.monotonic()+10
        while time.monotonic()<deadline:
            if healthy(port,bind=='0.0.0.0'):return f'http://127.0.0.1:{port}/repair'
            if process.poll() is not None:break
            time.sleep(.15)
        if process.poll() is None:process.terminate()
    raise RuntimeError('映屏暂时没有启动成功。请确认文件夹完整，或关闭重复打开的预览服务后重试。')


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--bind',choices=('127.0.0.1','0.0.0.0'),default='127.0.0.1')
    parser.add_argument('--port',type=int,default=8780)
    parser.add_argument('--no-open',action='store_true')
    args=parser.parse_args()
    try:
        address=ensure_started(args.bind,args.port)
        if not args.no_open:webbrowser.open(address)
        if sys.stdout:print(address)
    except Exception as error:
        if sys.stderr:print(str(error),file=sys.stderr)
        if sys.platform=='win32' and not args.no_open:
            import ctypes
            ctypes.windll.user32.MessageBoxW(None,str(error),'映屏启动提示',16)
        raise SystemExit(1)

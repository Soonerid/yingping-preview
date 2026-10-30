from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from urllib.request import build_opener,ProxyHandler
from urllib.parse import urlsplit
import importlib.util,shutil,subprocess,threading,unittest
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'work';WORK.mkdir(exist_ok=True)
ASSETS=('server.py','start_preview.py','index.html','studio.css','studio.js','devices.js','icons.js','repair.html','demo.html')
HTTP=build_opener(ProxyHandler({}))
class StartupTests(unittest.TestCase):
 def setUp(self):
  self.temp=TemporaryDirectory(prefix='startup-',dir=WORK);self.folder=Path(self.temp.name).resolve();self.folder.relative_to(WORK.resolve());self.children=[];self.real_popen=subprocess.Popen
 def tearDown(self):
  for child in self.children:
   if child.poll() is None:
    child.terminate()
    try:child.wait(timeout=5)
    except subprocess.TimeoutExpired:child.kill();child.wait(timeout=5)
  self.temp.cleanup()
 def project(self,name):
  folder=self.folder/name;folder.mkdir()
  for file in ASSETS:shutil.copyfile(ROOT/file,folder/file)
  spec=importlib.util.spec_from_file_location('launcher_'+str(len(self.children)),folder/'start_preview.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return folder,module
 def free_port(self):
  import socket
  with socket.socket() as sock:sock.bind(('127.0.0.1',0));return sock.getsockname()[1]
 def start(self,module,port):
  def capture(*args,**kwargs):
   child=self.real_popen(*args,**kwargs);self.children.append(child);return child
  with patch.object(module.subprocess,'Popen',side_effect=capture):return module.ensure_started(preferred=port)
 def test_space_and_chinese_directory(self):
  folder,module=self.project('师弟 解压后的页面');url=self.start(module,self.free_port());origin='http://127.0.0.1:'+str(urlsplit(url).port)
  for file in ('index.html','studio.css','studio.js','devices.js','icons.js','demo.html','repair'):
   with HTTP.open(origin+'/'+file,timeout=3) as response:self.assertEqual(response.status,200)
  self.assertTrue(module.healthy(urlsplit(url).port));self.assertEqual(len(self.children),1)
 def test_occupied_port_and_repeated_launch(self):
  class OtherService(BaseHTTPRequestHandler):
   def log_message(self,*args):pass
   def do_GET(self):self.send_response(200);self.end_headers();self.wfile.write(b'OTHER_SERVICE_SENTINEL')
  other=ThreadingHTTPServer(('127.0.0.1',0),OtherService);thread=threading.Thread(target=other.serve_forever,daemon=True);thread.start()
  try:
   _,module=self.project('own-viewer');url=self.start(module,other.server_port);self.assertNotEqual(urlsplit(url).port,other.server_port)
   self.assertEqual(self.start(module,other.server_port),url);self.assertEqual(len(self.children),1)
   with HTTP.open('http://127.0.0.1:'+str(other.server_port),timeout=3) as response:self.assertEqual(response.read(),b'OTHER_SERVICE_SENTINEL')
  finally:other.shutdown();other.server_close();thread.join()
 def test_different_old_assets_are_not_reused(self):
  first,a=self.project('old');second,b=self.project('new');(second/'studio.css').write_text((second/'studio.css').read_text(encoding='utf-8')+'\n/* fresh version */',encoding='utf-8')
  one=self.start(a,self.free_port());two=self.start(b,urlsplit(one).port);self.assertNotEqual(one,two);self.assertEqual(len(self.children),2)
  self.assertTrue(a.healthy(urlsplit(one).port));self.assertTrue(b.healthy(urlsplit(two).port));self.assertFalse(b.healthy(urlsplit(one).port))
if __name__=='__main__':unittest.main()

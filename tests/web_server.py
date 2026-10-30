from pathlib import Path
from urllib.request import Request,build_opener,ProxyHandler
from urllib.parse import quote
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer
import importlib.util
import json
import threading
import unittest
import runpy
import sys
import io
from contextlib import redirect_stderr
from unittest.mock import patch

ROOT=Path(__file__).resolve().parent.parent
APP=ROOT
spec=importlib.util.spec_from_file_location('preview_server',APP/'server.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
launch_spec=importlib.util.spec_from_file_location('preview_launcher',APP/'start_preview.py')
launcher=importlib.util.module_from_spec(launch_spec);launch_spec.loader.exec_module(launcher)


class PreviewTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=mod.PreviewServer(('127.0.0.1',0),mod.Viewer)
        cls.origin=f'http://127.0.0.1:{cls.server.server_port}'
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
        cls.http=build_opener(ProxyHandler({}))

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join()

    def test_viewer_assets(self):
        for name in ('','studio.css','studio.js','devices.js','icons.js'):
            with self.http.open(self.origin+'/'+name) as r:
                self.assertEqual(r.status,200)
                if name.endswith('.css'):self.assertEqual(r.headers.get_content_type(),'text/css')
                if name.endswith('.js'):self.assertEqual(r.headers.get_content_type(),'text/javascript')

    def test_sample_is_embeddable_same_origin(self):
        with self.http.open(self.origin+'/sample/') as r:
            self.assertEqual(r.headers['Content-Security-Policy'],"frame-ancestors 'self'")
            self.assertNotIn('X-Frame-Options',r.headers)
            self.assertIn('虚构布局示例'.encode(),r.read())

    def test_no_real_roster_or_source(self):
        for path in ('members.json','server.py','.env','ai-config.json','使用说明.md','../组会看板/members.json','%2e%2e/%e7%bb%84%e4%bc%9a%e7%9c%8b%e6%9d%bf/members.json'):
            with self.assertRaises(HTTPError) as error:self.http.open(self.origin+'/'+quote(path,safe='/%'))
            self.assertEqual(error.exception.code,404)

    def test_private_api_stays_closed(self):
        for path in ('meetings','members','devices','admin/members','assistant/status'):
            with self.assertRaises(HTTPError) as error:self.http.open(self.origin+'/api/'+path)
            self.assertEqual(error.exception.code,401)

    def test_anonymous_session_only(self):
        with self.assertRaises(HTTPError) as error:self.http.open(self.origin+'/api/session')
        self.assertEqual(error.exception.code,401)

    def test_writes_are_disabled(self):
        with self.assertRaises(HTTPError) as error:self.http.open(Request(self.origin+'/api/meetings',data=b'{}',headers={'Content-Type':'application/json'}))
        self.assertEqual(error.exception.code,405)

    def test_share_info_loopback_is_not_shareable(self):
        with self.http.open(self.origin+'/api/preview-info') as r:
            self.assertEqual(json.load(r)['lan_urls'],[])

    def test_lan_addresses_exclude_vpn_and_link_local(self):
        from unittest.mock import patch
        entries=[(2,1,6,'',(ip,0)) for ip in ('192.168.1.50','198.18.0.1','169.254.4.5','127.0.0.1')]
        with patch.object(mod.socket,'getaddrinfo',return_value=entries):
            self.assertEqual(mod.lan_urls('0.0.0.0',8780),['http://192.168.1.50:8780/'])

    def test_portable_sample_without_sibling_project(self):
        from unittest.mock import patch
        self.assertFalse(hasattr(mod,'SAMPLE'))
        with self.http.open(self.origin+'/sample/') as r:self.assertIn('虚构布局示例'.encode(),r.read())

    def test_archive_is_a_fixed_download(self):
        if not mod.ARCHIVE.is_file():
            with self.assertRaises(HTTPError) as error:self.http.open(self.origin+'/download')
            self.assertEqual(error.exception.code,404)
            return
        with self.http.open(self.origin+'/download') as r:
            self.assertEqual(r.headers['Content-Type'],'application/zip')
            self.assertTrue(r.read(4).startswith(b'PK'))

    def test_shared_launcher_does_not_reuse_loopback_only_server(self):
        args=['server.py','--bind','0.0.0.0','--port',str(self.server.server_port),'--open']
        with patch.object(sys,'argv',args),patch('webbrowser.open') as opened,redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as result:runpy.run_path(str(APP/'server.py'),run_name='__main__')
        self.assertEqual(result.exception.code,2)
        opened.assert_not_called()

    def test_local_launcher_reuses_existing_preview(self):
        args=['server.py','--port',str(self.server.server_port),'--open']
        with patch.object(sys,'argv',args),patch('webbrowser.open') as opened:
            with self.assertRaises(SystemExit) as result:runpy.run_path(str(APP/'server.py'),run_name='__main__')
        self.assertEqual(result.exception.code,0)
        opened.assert_called_once_with(self.origin+'/')

    def test_existing_port_cannot_be_bound_twice(self):
        with self.assertRaises(OSError):mod.PreviewServer(('127.0.0.1',self.server.server_port),mod.Viewer)

    def test_launch_health_checks_version_and_resources(self):
        self.assertTrue(launcher.healthy(self.server.server_port))
        self.assertFalse(launcher.healthy(self.server.server_port,shared=True))

    def test_sample_does_not_install_a_root_worker(self):
        for file in ('sample-runtime.js','app.js','members.json'):
            with self.assertRaises(HTTPError) as error:self.http.open(self.origin+'/'+file)
            self.assertEqual(error.exception.code,404)

    def test_old_worker_is_retired_without_caching_viewer(self):
        with self.http.open(self.origin+'/sw.js') as r:
            script=r.read()
            self.assertIn(b'registration.unregister()',script)
            self.assertNotIn(b'cache.addAll',script)
            self.assertIn(b"startsWith('gm-shell-')",script)

    def test_repair_cleans_only_sample_cache(self):
        with self.http.open(self.origin+'/repair') as r:
            html=r.read()
            self.assertIn(b"scriptURL===location.origin+'/sw.js'",html)
            self.assertIn(b"startsWith('gm-shell-')",html)
            self.assertIn(b'location.replace',html)


if __name__=='__main__':unittest.main()

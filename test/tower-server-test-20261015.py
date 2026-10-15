"""Local server boundary tests; no installer or application is launched."""
import importlib.util
import json
from pathlib import Path
import threading
import unittest
import urllib.request
import urllib.error
from unittest.mock import patch

source=Path(__file__).resolve().parents[1]/'tools'/'discord-tower-server-20261015.py'
spec=importlib.util.spec_from_file_location('tower',source)
tower=importlib.util.module_from_spec(spec);spec.loader.exec_module(tower)

class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=tower.ThreadingHTTPServer(('127.0.0.1',0),tower.Handler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
        cls.url='http://127.0.0.1:'+str(cls.server.server_address[1])
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join()
    def request(self,path,headers=None,method='POST'):
        request=urllib.request.Request(self.url+path,data=b'' if method=='POST' else None,headers=headers or {},method=method)
        try:
            with urllib.request.urlopen(request) as response:return response.status,json.load(response)
        except urllib.error.HTTPError as error:return error.code,json.load(error)
    def headers(self):return {'Host':'127.0.0.1:38764','Origin':tower.ORIGIN,'X-Discord-Tower':'local-action'}
    def test_unexpected_host_is_refused(self):
        self.assertEqual(self.request('/api/status',method='GET')[0],403)
    def test_foreign_origin_and_missing_action_header_are_refused(self):
        for field in ('Origin','X-Discord-Tower'):
            headers=self.headers();headers.pop(field)
            self.assertEqual(self.request('/api/check',headers)[0],403)
        headers=self.headers();headers['Origin']='https://example.com'
        self.assertEqual(self.request('/api/open-discord',headers)[0],403)
    def test_unknown_route_never_dispatches(self):
        self.assertEqual(self.request('/api/execute',self.headers())[0],404)
    def test_busy_action_is_not_duplicated(self):
        tower.busy.acquire()
        try:self.assertEqual(self.request('/api/check',self.headers())[0],409)
        finally:tower.busy.release()
    def test_discord_route_launches_only_fixed_uri(self):
        called=threading.Event()
        with patch.object(tower.os,'startfile',side_effect=lambda uri:called.set()) as launch:
            self.assertEqual(self.request('/api/open-discord',self.headers())[0],202)
            self.assertTrue(called.wait(2));launch.assert_called_once_with('discord://-/')

if __name__=='__main__':unittest.main()

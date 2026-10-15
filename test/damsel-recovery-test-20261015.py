import importlib.util
import pathlib
import tempfile
import unittest
from unittest.mock import patch
import zipfile

SOURCE=pathlib.Path(__file__).resolve().parents[1]/'tools'/'discord-damsel-20261015.py'
spec=importlib.util.spec_from_file_location('damsel',SOURCE)
d=importlib.util.module_from_spec(spec); spec.loader.exec_module(d)

class Tests(unittest.TestCase):
    def test_health_latest_version_and_missing_archive(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=pathlib.Path(tmp); bd=base/'bd'
            for version in ('1.0.9','1.0.10'):
                folder=base/'Discord'/('app-'+version)/'modules/discord_desktop_core-1/discord_desktop_core'
                folder.mkdir(parents=True)
                (folder/'index.js').write_text('betterdiscord' if version=='1.0.9' else 'core.asar')
            result=d.health(base,bd)[0]
            self.assertEqual(result['version'],'app-1.0.10'); self.assertTrue(result['needs_repair'])
    def test_park_restore_preserves_bytes_refuses_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=pathlib.Path(tmp); p=base/'example.plugin.js'; p.write_bytes(b'plugin example')
            with patch.object(d,'stamp',return_value='20261015-010000'):
                archive=d.park(p,'plugins',base/'data')
            self.assertFalse(p.exists())
            target=d.restore(archive,base/'bd'); self.assertEqual(target.read_bytes(),b'plugin example')
            with self.assertRaises(FileExistsError): d.restore(archive,base/'bd')
    def test_reject_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=pathlib.Path(tmp)/'bad-20261015.zip'
            with zipfile.ZipFile(p,'w') as z: z.writestr('../bad.plugin.js','bad')
            with self.assertRaises(ValueError): d.restore(p,pathlib.Path(tmp)/'bd')
    def test_offline_backoff_and_recovery(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=pathlib.Path(tmp)
            with patch.object(d,'DATA',base),patch.object(d,'STATE',base/'state-20261015.json'),patch.object(d,'health',return_value=[{'needs_repair':True}]),patch.object(d,'installer_valid',return_value=False),patch.object(d,'download',side_effect=OSError('offline')) as download:
                first=d.check(); second=d.check()
                self.assertEqual(download.call_count,1); self.assertEqual(second['error'],'offline')
                with patch.object(d,'download',return_value=(base/'installer-20261015.exe','v2','abc')):
                    recovered=d.check(True); self.assertEqual(recovered['error'],'')
    def test_denver_stamp(self):
        self.assertRegex(d.stamp(),r'^\d{8}-\d{6}$')

class StateTests(unittest.TestCase):
    def test_invalid_state_recovers(self):
        with tempfile.TemporaryDirectory() as tmp:
            state=pathlib.Path(tmp)/'state-20261015.json'
            for text in ('null','[]','1','{'):
                state.write_text(text)
                with patch.object(d,'STATE',state): self.assertEqual(d.read_state(),{})
    def test_installer_bound_to_recovery_folder(self):
        with tempfile.TemporaryDirectory() as tmp:
            base=pathlib.Path(tmp)
            with patch.object(d,'BASE',base):
                self.assertEqual(d.installer_path({}),base/'betterdiscord-installer-20261015.exe')
                for state in ({'installer':12},{'installer':str(base.parent/'outside.exe')},{'installer':str(base/'unrelated.exe')}):
                    self.assertFalse(d.installer_valid(state))

if __name__=='__main__':unittest.main()

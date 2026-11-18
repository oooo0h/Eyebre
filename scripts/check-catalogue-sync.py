"""Regression checks for source hashes, stale-page replacement and failure isolation."""
import importlib.util, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
from subprocess import CompletedProcess, TimeoutExpired

spec=importlib.util.spec_from_file_location('sync',Path(__file__).with_name('sync-catalogues.py'))
sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)

class SyncTests(unittest.TestCase):
    def test_transient_network_failure_retries_then_succeeds(self):
        results=[CompletedProcess([],1,'','Get https://api.github.com: EOF'),
                 CompletedProcess([],0,'[{"status":"completed"}]\n','')]
        with patch.object(sync.subprocess,'run',side_effect=results) as run,patch.object(sync.time,'sleep') as sleep:
            self.assertEqual(sync.command(['gh','run','list'],capture=True,network_retry=True),'[{"status":"completed"}]')
            self.assertEqual(run.call_count,2);sleep.assert_called_once_with(3)

    def test_auth_failure_is_not_retried(self):
        with patch.object(sync.subprocess,'run',return_value=CompletedProcess([],1,'','HTTP 401: Bad credentials')) as run,patch.object(sync.time,'sleep') as sleep:
            with self.assertRaisesRegex(RuntimeError,'命令执行失败'):
                sync.command(['gh','run','list'],network_retry=True)
            self.assertEqual(run.call_count,1);sleep.assert_not_called()

    def test_network_retries_are_bounded(self):
        with patch.object(sync.subprocess,'run',return_value=CompletedProcess([],1,'','unexpected EOF')) as run,patch.object(sync.time,'sleep') as sleep:
            with self.assertRaisesRegex(RuntimeError,'网络连接中断'):
                sync.command(['gh','run','list'],network_retry=True)
            self.assertEqual(run.call_count,3);self.assertEqual(sleep.call_count,2)

    def test_timeout_retries(self):
        with patch.object(sync.subprocess,'run',side_effect=[TimeoutExpired('gh',180),CompletedProcess([],0,'ok','')]),patch.object(sync.time,'sleep'):
            self.assertEqual(sync.command(['gh','run','list'],capture=True,network_retry=True),'ok')

    def test_only_git_network_operations_allow_retries(self):
        with patch.object(sync,'command') as command:
            for operation in ('fetch','push','commit','merge'):
                sync.git(operation)
                self.assertEqual(command.call_args.kwargs['network_retry'],operation in ('fetch','push'))

    def test_content_hash_ignores_modification_time(self):
        import os
        with tempfile.TemporaryDirectory() as folder:
            p=Path(folder)/'source.pdf';p.write_bytes(b'unchanged content')
            before=sync.sha256(p);os.utime(p,(1000,1000))
            self.assertEqual(before,sync.sha256(p))
            p.write_bytes(b'new content');self.assertNotEqual(before,sync.sha256(p))

    def test_cleanup_rejects_outside_or_root(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)/'allowed';root.mkdir();source=Path(folder)/'original.pdf';source.write_bytes(b'keep')
            for target in [source,root]:
                with self.assertRaises(RuntimeError):sync.remove_local(target,root)
            self.assertTrue(source.exists())

    def test_failing_build_does_not_replace_live_assets(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder); pdfs=root/'dist/assets/catalogues';pdfs.mkdir(parents=True)
            live=pdfs/'book.pdf';live.write_bytes(b'published PDF')
            manifest=pdfs/'manifest.json';sync.save_json(manifest,[])
            source=root/'source.pdf';source.write_bytes(b'updated PDF')
            local=root/'state';local.mkdir()
            stamps={'book':{'sha256':'new','pageCount':1,'bytes':11}}
            with patch.multiple(sync,ROOT=root,LOCAL=local,PDFS=pdfs,MANIFEST=manifest,ACTIVE=('book',)),patch.object(sync,'build_book',side_effect=RuntimeError('invalid PDF')):
                with self.assertRaisesRegex(RuntimeError,'invalid PDF'):
                    sync.prepare({'sources':{'book':str(source)}},stamps)
            self.assertEqual(live.read_bytes(),b'published PDF')
            self.assertEqual(sync.read_json(manifest),[])

    def test_rebuild_replaces_whole_page_directory(self):
        # A shorter new PDF must never leave pages from the previous edition.
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);pdfs=root/'dist/assets/catalogues';pdfs.mkdir(parents=True)
            pages=root/'dist/assets/catalogue-pages';live=pages/'book';(live/'hd').mkdir(parents=True)
            (live/'0002.webp').write_bytes(b'stale');(pdfs/'book.pdf').write_bytes(b'old')
            manifest=pdfs/'manifest.json';sync.save_json(manifest,[])
            local=root/'state';local.mkdir();source=root/'source.pdf';source.write_bytes(b'new')
            stamps={'book':{'sha256':sync.sha256(source),'pageCount':1,'bytes':3}}
            def build(slug,source,expected,stage):
                book=stage/slug;folder=book/'pages';(folder/'hd').mkdir(parents=True)
                (book/'source.pdf').write_bytes(b'new');(book/'book.pdf').write_bytes(b'new')
                (book/'book-cover.webp').write_bytes(b'cover');(folder/'0001.webp').write_bytes(b'page')
                sync.save_json(folder/'index.json',{'pageCount':1,'bytes':4,'pages':[{'bytes':4}]})
                return {'filename':'book.pdf','sourceSha256':expected['sha256'],'pageCount':1}
            with patch.multiple(sync,ROOT=root,LOCAL=local,PDFS=pdfs,PAGES=pages,MANIFEST=manifest,ACTIVE=('book',)),patch.object(sync,'build_book',side_effect=build),patch.object(sync.subprocess,'run'):
                self.assertTrue(sync.prepare({'sources':{'book':str(source)}},stamps))
            self.assertFalse((live/'0002.webp').exists());self.assertTrue((live/'0001.webp').exists())
            self.assertEqual((pdfs/'book.pdf').read_bytes(),b'new')
            self.assertEqual(sync.read_json(manifest)[0]['sourceSha256'],stamps['book']['sha256'])

if __name__=='__main__':unittest.main()

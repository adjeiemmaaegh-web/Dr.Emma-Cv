#!/usr/bin/env python3
"""Native Chromium / actual IndexedDB contract checks with synthetic test records."""
import http.server,threading,json
from pathlib import Path
from functools import partial
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass

def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
 thread=threading.Thread(target=server.serve_forever,daemon=True)
 thread.start()
 try:
  with sync_playwright() as playwright:
   browser=playwright.chromium.launch(headless=True)
   context=browser.new_context()
   page=context.new_page()
   errors=[]
   page.on('pageerror',lambda error:errors.append(str(error)))
   url=f'http://127.0.0.1:{server.server_port}/tests/platform/fixtures/platform-browser.html'
   page.goto(url,wait_until='load')
   page.wait_for_function('Boolean(window.ledgerPlatformFixture)')
   result=page.evaluate("""async()=>{
     const t=window.ledgerPlatformFixture;
     const id='profile'+crypto.randomUUID().replaceAll('-','');
     const databaseName='ledger_cv_platform_test_'+crypto.randomUUID().replaceAll('-','');
     const storageKey='ledger_cv_state_v2';
     localStorage.setItem(storageKey,'synthetic legacy sentinel');
     const store1=t.createIndexedDBRevisionStore({databaseName});
     const store2=t.createIndexedDBRevisionStore({databaseName});
     const p=t.createCareerProfile({id,idFactory:()=> 'masterABC123'});
     if((await store1.load(id))!==null)throw Error('unexpected existing profile');
     const init=await store1.save(id,p,null);
     if(init.revision!==0)throw Error('initial revision');
     const a=t.createCVVariant(p,{id:'variantABC123',expectedRevision:0});
     const b=t.createCVVariant(p,{id:'variantDEF123',expectedRevision:0});
     const attempts=await Promise.allSettled([store1.save(id,a,0),store2.save(id,b,0)]);
     if(attempts.filter(x=>x.status==='fulfilled').length!==1||
        attempts.filter(x=>x.status==='rejected').length!==1)throw Error('two stale commits succeeded');
     const read=await store2.load(id);
     if(read.revision!==1)throw Error('revision not persisted');
     if(localStorage.getItem(storageKey)!=='synthetic legacy sentinel')throw Error('modified legacy');
     const backup=await t.createCareerProfileBackup(read.value);
     const restored=await t.previewCareerProfileBackup(backup);
     if(restored.status!=='review-required'||restored.proposed.revision!==1)throw Error('backup invalid');
     const registry=t.createFeatureRegistry();
     let mounted=false;
     registry.register({id:'demo-feature',mount:({host})=>{
       if(host.id!=='platform-root')throw Error('wrong host');
       mounted=true;return ()=>{mounted=false}
     }});
     await registry.mount('demo-feature',{host:document.getElementById('platform-root')});
     if(!mounted)throw Error('feature not mounted');
     await registry.unmount('demo-feature');
     if(mounted)throw Error('feature not disposed');
     return {id,databaseName,revision:read.revision,conflicts:1,legacyUnchanged:true,backup:true,featureMount:true};
   }""")
   page.reload(wait_until='load')
   page.wait_for_function('Boolean(window.ledgerPlatformFixture)')
   persisted=page.evaluate("""async r=>{
     const store=window.ledgerPlatformFixture.createIndexedDBRevisionStore({databaseName:r.databaseName});
     const saved=await store.load(r.id);
     return saved?.revision===1&&saved.value.variants.length===1;
   }""",result)
   assert persisted,'data lost after real browser restart/reload'
   assert not errors,errors
   print('PASS native browser Group A',json.dumps(result),flush=True)
   context.close();browser.close()
 finally:
  server.shutdown();server.server_close()
if __name__=='__main__':main()

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
     if(JSON.stringify(await store1.listIds())!==JSON.stringify([id]))throw Error('profile discovery missing');
     const corruptId='profileCORRUPT123';
     const open=await new Promise((resolve,reject)=>{
       const req=indexedDB.open(databaseName,1);
       req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
     });
     await new Promise((resolve,reject)=>{
       const tx=open.transaction('career_profiles','readwrite');
       tx.objectStore('career_profiles').put({id:corruptId,revision:4,value:{id:corruptId,revision:4}});
       tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
     });
     open.close();
     let corruptLoad=false,corruptSave=false;
     try{await store1.load(corruptId)}catch(e){corruptLoad=e.code==='CORRUPT'}
     try{await store1.save(corruptId,{...p,id:corruptId,revision:5},4)}
     catch(e){corruptSave=e.code==='CORRUPT'}
     if(!corruptLoad||!corruptSave)throw Error('corrupt row was accepted or overwritten');
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
   # Two distinct browser tabs sharing one IndexedDB origin. A stale tab must
   # receive a typed conflict and retain the other tab's committed edit.
   tab2=context.new_page()
   tab2.on('pageerror',lambda error:errors.append(str(error)))
   tab2.goto(url,wait_until='load')
   tab2.wait_for_function('Boolean(window.ledgerPlatformFixture)')
   second_read=tab2.evaluate("""async r=>{
     const t=window.ledgerPlatformFixture;
     const store=t.createIndexedDBRevisionStore({databaseName:r.databaseName});
     const saved=await store.load(r.id);
     const next=t.createCVVariant(saved.value,{id:'variantTABTWO123',expectedRevision:saved.revision});
     window.syntheticTabTwo={store,next,expected:saved.revision,id:r.id};
     return {revision:saved.revision,variants:saved.value.variants.length};
   }""",result)
   assert second_read=={'revision':1,'variants':1},second_read
   first_saved=page.evaluate("""async r=>{
     const t=window.ledgerPlatformFixture;
     const store=t.createIndexedDBRevisionStore({databaseName:r.databaseName});
     const current=await store.load(r.id);
     const next=t.createCVVariant(current.value,{id:'variantTABONE123',expectedRevision:current.revision});
     return (await store.save(r.id,next,current.revision)).revision;
   }""",result)
   assert first_saved==2,first_saved
   stale_result=tab2.evaluate("""async()=>{
     const {store,next,expected,id}=window.syntheticTabTwo;
     try{await store.save(id,next,expected);return 'INCORRECTLY_SAVED'}
     catch(error){return error.code}
   }""")
   assert stale_result=='CONFLICT',f'stale tab overwrote another commit: {stale_result}'
   winner=tab2.evaluate("""async r=>{
     const t=window.ledgerPlatformFixture;
     const saved=await t.createIndexedDBRevisionStore({databaseName:r.databaseName}).load(r.id);
     return {revision:saved.revision,variants:saved.value.variants.map(v=>v.id)};
   }""",result)
   assert winner['revision']==2 and 'variantTABONE123' in winner['variants'] and 'variantTABTWO123' not in winner['variants'],winner
   assert tab2.evaluate("localStorage.getItem('ledger_cv_state_v2')")=='synthetic legacy sentinel'
   tab2.close()
   result['twoDistinctTabsConflictSafe']=True
   # Exercise the actual isolated workbench, not just the storage API.
   page.goto(f'http://127.0.0.1:{server.server_port}/development/group-a/profile-workbench.html',wait_until='load')
   page.wait_for_selector('button:has-text("Create new profile")')
   page.locator('input[placeholder="Career profile name"]').fill('Synthetic QA Profile')
   page.get_by_role('button',name='Create new profile').click()
   page.wait_for_function("document.querySelector('[role=status]')?.textContent.startsWith('Saved locally')")
   assert 'Synthetic QA Profile' in page.locator('pre').first.inner_text()
   page.reload(wait_until='load')
   page.wait_for_function("""[...document.querySelectorAll('select[aria-label="Saved local profiles"] option')].some(x=>x.value.startsWith('ledger_'))""")
   page.get_by_role('button',name='Open selected saved profile').click()
   page.wait_for_function("document.querySelector('[role=status]')?.textContent.startsWith('Loaded saved profile')")
   assert 'Synthetic QA Profile' in page.locator('pre').first.inner_text()
   page.locator('input[placeholder="Evidence-backed achievement or responsibility"]').fill('Synthetic owner-confirmed responsibility')
   page.get_by_role('button',name='Add verified-by-me evidence').click()
   page.wait_for_function("document.querySelector('[role=status]')?.textContent.includes('revision 1')")
   page.reload(wait_until='load')
   page.wait_for_function("""[...document.querySelectorAll('select[aria-label="Saved local profiles"] option')].some(x=>x.value.startsWith('ledger_'))""")
   page.get_by_role('button',name='Open selected saved profile').click()
   page.wait_for_function("document.querySelector('[role=status]')?.textContent.startsWith('Loaded saved profile')")
   assert 'Evidence entries: 1' in page.locator('pre').first.inner_text()
   page.locator('textarea[placeholder="Applicant-written CV summary"]').fill('Synthetic owner-entered summary A')
   page.once('dialog',lambda dialog:dialog.accept())
   page.get_by_role('button',name='Save selected CV summary').click()
   page.wait_for_function("document.querySelector('[role=status]')?.textContent.includes('revision 2')")
   page.locator('textarea[placeholder="Applicant-written CV summary"]').fill('Synthetic owner-entered summary B')
   page.once('dialog',lambda dialog:dialog.accept())
   page.get_by_role('button',name='Save selected CV summary').click()
   page.wait_for_function("document.querySelector('[role=status]')?.textContent.includes('revision 3')")
   # Profile revision also counts evidence edits; the master CV's prior
   # document revision here is 1, not profile revision 2.
   page.locator('select[aria-label="Previous CV revision"]').select_option('1')
   page.once('dialog',lambda dialog:dialog.accept())
   page.get_by_role('button',name='Restore selected previous CV revision').click()
   page.wait_for_function("document.querySelector('[role=status]')?.textContent.includes('revision 4')")
   assert page.locator('textarea[placeholder="Applicant-written CV summary"]').input_value()=='Synthetic owner-entered summary A'
   page.reload(wait_until='load')
   page.wait_for_function("""[...document.querySelectorAll('select[aria-label="Saved local profiles"] option')].some(x=>x.value.startsWith('ledger_'))""")
   page.get_by_role('button',name='Open selected saved profile').click()
   page.wait_for_function("document.querySelector('[role=status]')?.textContent.startsWith('Loaded saved profile')")
   assert page.locator('textarea[placeholder="Applicant-written CV summary"]').input_value()=='Synthetic owner-entered summary A'
   # Switching CVs cannot silently erase a summary draft. Unrelated evidence
   # saves must not erase the unsaved text either.
   page.get_by_role('button',name='Create tailored copy').click()
   page.wait_for_function("document.querySelector('[role=status]')?.textContent.includes('revision 5')")
   chooser=page.locator('select[aria-label="CV version to edit"]')
   master_id=chooser.locator('option').nth(0).get_attribute('value')
   variant_id=chooser.locator('option').nth(1).get_attribute('value')
   page.locator('textarea[placeholder="Applicant-written CV summary"]').fill('Uncommitted synthetic master draft')
   assert 'Unsaved CV summary draft' in page.locator('p[aria-live="polite"]').inner_text()
   page.once('dialog',lambda dialog:dialog.dismiss())
   chooser.select_option(variant_id)
   assert chooser.input_value()==master_id,'declined switch discarded the active CV'
   assert page.locator('textarea[placeholder="Applicant-written CV summary"]').input_value()=='Uncommitted synthetic master draft'
   page.locator('input[placeholder="Evidence-backed achievement or responsibility"]').fill('Additional synthetic evidence')
   page.get_by_role('button',name='Add verified-by-me evidence').click()
   page.wait_for_function("document.querySelector('[role=status]')?.textContent.includes('revision 6')")
   assert page.locator('textarea[placeholder="Applicant-written CV summary"]').input_value()=='Uncommitted synthetic master draft','unrelated profile save lost summary draft'
   assert 'Unsaved CV summary draft' in page.locator('p[aria-live="polite"]').inner_text()
   # Two separate workbench tabs: a stale save must fail and leave the typed
   # draft on screen, while the first tab's newly committed summary wins.
   workbench_url=f'http://127.0.0.1:{server.server_port}/development/group-a/profile-workbench.html'
   stale_tab=context.new_page()
   stale_tab.on('pageerror',lambda error:errors.append(str(error)))
   stale_tab.goto(workbench_url,wait_until='load')
   stale_tab.wait_for_function("""[...document.querySelectorAll('select[aria-label="Saved local profiles"] option')].some(x=>x.value.startsWith('ledger_'))""")
   stale_tab.get_by_role('button',name='Open selected saved profile').click()
   stale_tab.wait_for_function("document.querySelector('[role=status]')?.textContent.startsWith('Loaded saved profile')")
   stale_tab.locator('textarea[placeholder="Applicant-written CV summary"]').fill('Synthetic stale tab summary')
   page.once('dialog',lambda dialog:dialog.accept())
   page.get_by_role('button',name='Save selected CV summary').click()
   page.wait_for_function("document.querySelector('[role=status]')?.textContent.includes('revision 7')")
   stale_tab.once('dialog',lambda dialog:dialog.accept())
   stale_tab.get_by_role('button',name='Save selected CV summary').click()
   stale_tab.wait_for_function("document.querySelector('[role=status]')?.textContent.includes('Not saved (conflict)')")
   assert stale_tab.locator('textarea[placeholder="Applicant-written CV summary"]').input_value()=='Synthetic stale tab summary','conflict destroyed unsaved draft'
   assert 'Unsaved CV summary draft' in stale_tab.locator('p[aria-live="polite"]').inner_text()
   stale_tab.close()
   page.reload(wait_until='load')
   page.wait_for_function("""[...document.querySelectorAll('select[aria-label="Saved local profiles"] option')].some(x=>x.value.startsWith('ledger_'))""")
   page.get_by_role('button',name='Open selected saved profile').click()
   page.wait_for_function("document.querySelector('[role=status]')?.textContent.startsWith('Loaded saved profile')")
   assert page.locator('textarea[placeholder="Applicant-written CV summary"]').input_value()=='Uncommitted synthetic master draft','lost winning committed summary'
   result['draftSwitchGuard']=True
   result['draftSurvivesEvidenceSave']=True
   result['workbenchConflictDraftSafe']=True
   result['workbenchReload']=True
   result['workbenchRevisionRestore']=True
   assert not errors,errors
   print('PASS native browser Group A',json.dumps(result),flush=True)
   context.close();browser.close()
 finally:
  server.shutdown();server.server_close()
if __name__=='__main__':main()

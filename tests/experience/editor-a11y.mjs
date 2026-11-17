// Stage 17 audit of Group B's editor feature (E reports findings; B owns fixes). Run: node tests/experience/editor-a11y.mjs
import assert from 'node:assert/strict';
import {chromium,serve,shell,fmt} from './harness.mjs';
import {tabReachability} from '../../src/features/accessibility/a11y-audit.mjs';
const page_html=shell(`
import {createFeatureRegistry} from '/src/core/feature-registry.mjs';
import {editorFeature} from '/src/features/editor/editor-module.mjs';
import {SYNTH_DOC} from '/tests/documents/fixtures.mjs';
const reg=createFeatureRegistry();reg.register(editorFeature);
await reg.mount('cv-editor',{host:document.getElementById('app'),services:{documentSource:{load:()=>({document:SYNTH_DOC(),appearance:{}}),save:async()=>{}}}});
window.ready=true;`);
const {port,close}=serve({'/':page_html});
const browser=await chromium.launch();let failed=false;
try{
 for(const vp of [{width:320,height:640},{width:1280,height:800}]){
  const ctx=await browser.newContext({viewport:vp}),page=await ctx.newPage();
  await page.goto('http://localhost:'+port+'/');await page.waitForFunction(()=>window.ready);
  const r=await page.evaluate(async()=>(await import('/src/features/accessibility/a11y-audit.mjs')).auditAccessibility(document.getElementById('app')));
  const t=await tabReachability(page,'#app');
  const bad=r.findings.filter(f=>f.severity!=='info');
  console.log('editor at '+vp.width+'px: '+bad.length+' findings, unreached='+t.unreached.length+', noFocusIndicator='+t.noFocusIndicator.length);
  if(bad.length)console.log(fmt(bad.slice(0,12)));
  if(process.env.STRICT)assert.equal(bad.length+t.unreached.length+t.noFocusIndicator.length,0);
  await ctx.close();
 }
}catch(e){failed=true;console.error(e);}finally{await browser.close();close();}
process.exit(failed?1:0);

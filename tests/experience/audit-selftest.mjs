// Negative control: the audit must FIND known defects, otherwise a green run means nothing. Run: node tests/experience/audit-selftest.mjs
import assert from 'node:assert/strict';
import {chromium,serve} from './harness.mjs';
const bad=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,user-scalable=no"><title>bad</title></head><body><div id="app">
<h1>Title</h1><h4>Skipped level</h4>
<input name="email" placeholder="Email only a placeholder">
<button style="width:10px;height:10px;padding:0"></button>
<p style="color:#ccc;background:#fff">Low contrast text</p>
<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
<input id="dup" aria-label="a"><input id="dup" aria-label="b">
<input aria-invalid="true" aria-label="bad field">
<button aria-describedby="missing-id">Has bad reference</button>
<div style="width:2000px;height:5px"></div>
<div style="width:100px;height:20px;overflow:hidden">Clipped text clipped text clipped text clipped text</div>
</div></body></html>`;
const {port,close}=serve({'/':bad});const b=await chromium.launch();let failed=false;
try{
 const p=await (await b.newContext({viewport:{width:320,height:600}})).newPage();await p.goto('http://localhost:'+port+'/');
 const r=await p.evaluate(async()=>(await import('/src/features/accessibility/a11y-audit.mjs')).auditAccessibility(document.getElementById('app')));
 const rules=new Set(r.findings.map(f=>f.rule));
 for(const want of ['accessible-name','form-label','target-size','contrast','heading-skip','img-alt','duplicate-id','error-association','aria-reference','reflow','text-spacing','html-lang','viewport-zoom','autocomplete','live-region'])assert(rules.has(want),'audit missed '+want+'; found: '+[...rules]);
 assert(r.manualRequired.length>=6);
 console.log('PASS audit negative control: detected',rules.size,'rule types');
}catch(e){failed=true;console.error(e);}finally{await b.close();close();}
process.exit(failed?1:0);

// Real-browser checks of the Stage 4 onboarding feature + Stage 17 audit. Run: node tests/experience/onboarding-browser.mjs
import assert from 'node:assert/strict';
import {chromium,serve,shell,fmt} from './harness.mjs';
import {auditAccessibility,tabReachability} from '../../src/features/accessibility/a11y-audit.mjs';
const page_html=shell(`
import {createFeatureRegistry} from '/src/core/feature-registry.mjs';
import {onboardingFeature} from '/src/features/onboarding/onboarding-module.mjs';
const q=new URLSearchParams(location.search);
window.saved=[];window.failSave=false;window.draft=sessionStorage.getItem('draft');
const doc=q.get('doc')?{document:{personalInfo:{firstName:'Ama',lastName:'Mensah',title:'Cook',email:'ama@example.test'},summary:'',experience:[{id:'e1',title:'Cook',employer:'Acme',start:'2020',end:'',current:true,description:'<ul><li>Cooked meals</li></ul>'}],education:[],skills:[{name:'Cooking'}],languages:[],certifications:[],projects:[],accomplishments:[],hobbies:'',references:'',customSections:[]},appearance:{}}:null;
const services={documentSource:{load:()=>doc},documentSink:{save:async v=>{if(window.failSave)throw new Error('storage is full');window.saved.push(v);}}};
if(!q.get('nodraft'))services.draftStore={load:()=>window.draft,save:s=>{window.draft=s;sessionStorage.setItem('draft',s);},clear:()=>{window.draft=null;sessionStorage.removeItem('draft');}};
const reg=createFeatureRegistry();reg.register(onboardingFeature);
await reg.mount('onboarding',{host:{element:document.getElementById('app')},services});window.reg=reg;window.ready=true;`);
const {port,close}=serve({'/':page_html});
const browser=await chromium.launch();let failed=false;
const audit=async(page,label)=>{
 const r=await page.evaluate(async()=>{const m=await import('/src/features/accessibility/a11y-audit.mjs');return m.auditAccessibility(document.getElementById('app'));});
 const errs=r.findings.filter(f=>f.severity==='error'||f.severity==='warning');
 assert.equal(errs.length,0,'a11y findings at '+label+':\n'+fmt(errs));
 const t=await tabReachability(page,'#app');assert.deepEqual(t.unreached,[],'controls not reachable by Tab at '+label);assert.deepEqual(t.noFocusIndicator,[],'no visible focus indicator at '+label);
};
const type=async(page,label,text)=>{await page.getByLabel(label,{exact:false}).first().fill(text);};
try{
 for(const vp of [{width:320,height:640},{width:1280,height:800}]){
  const ctx=await browser.newContext({viewport:vp}),page=await ctx.newPage(),errors=[],reqs=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith('http://localhost:'+port))reqs.push(r.url());});
  const w=vp.width+'px';
  await page.goto('http://localhost:'+port+'/');await page.waitForFunction(()=>window.ready);
  await audit(page,'entry (no CV) '+w);
  // unavailable journeys explain themselves instead of being dead ends
  assert(await page.getByRole('button',{name:'Improve my CV'}).getAttribute('aria-disabled')==='true');
  assert.match(await page.locator('#app').innerText(),/You need a CV first/);
  await page.getByRole('button',{name:'Improve my CV'}).click({force:true}); // aria-disabled stays clickable so it can explain itself
  await page.waitForFunction(()=>/You need a CV first/.test(document.querySelector('[role=status]').textContent));
  // create journey, keyboard/typing only
  await page.getByRole('button',{name:'Create a CV'}).click();
  assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H2','focus moves to the step heading');
  await audit(page,'basics '+w);
  await page.getByRole('button',{name:'Next'}).click();                       // empty required fields
  await page.waitForSelector('#ob-errors');assert.equal(await page.evaluate(()=>document.activeElement.id),'ob-errors','focus goes to the error summary');
  assert.match(await page.locator('#ob-errors').innerText(),/Please fix 3 problems/);
  await audit(page,'basics errors '+w);
  await page.locator('#ob-errors a').first().click();assert.equal(await page.evaluate(()=>document.activeElement.id),'f-firstName','error link focuses its field');
  await type(page,'First name','Ama');await type(page,'Last name','Mensah');await type(page,'Email address','ama@example');
  await page.getByRole('button',{name:'Next'}).click();assert.match(await page.locator('#ob-errors').innerText(),/does not look right/);
  await type(page,'Email address','ama@example.test');await page.getByRole('button',{name:'Next'}).click();
  await page.getByRole('heading',{name:'The job you want'}).waitFor();await audit(page,'target '+w);
  await type(page,'Job title you are aiming for','Retail Supervisor');await page.getByRole('button',{name:'Next'}).click();
  await page.getByRole('heading',{name:'Your most recent job'}).waitFor();await audit(page,'experience '+w);
  // resume later: stop, return, continue
  await page.getByRole('button',{name:'Stop and finish later'}).click();
  await page.getByRole('button',{name:'Continue where I left off'}).click();
  await page.getByRole('heading',{name:'Your most recent job'}).waitFor();
  assert.equal(await page.getByLabel('Job title',{exact:false}).first().inputValue(),'');
  await page.getByRole('button',{name:'Back'}).click();assert.equal(await page.getByLabel('Job title you are aiming for').inputValue(),'Retail Supervisor');
  await page.getByRole('button',{name:'Next'}).click();
  await type(page,'Job title','Retail Supervisor');await type(page,'Employer','Acme Stores');await type(page,'Start date','Jan 2020');
  await page.getByLabel('I still work here').check();await type(page,'What you did','Trained 4 new colleagues\nOpened the store');
  await page.getByRole('button',{name:'Next'}).click();
  await page.getByRole('button',{name:'Skip this step'}).click();             // education
  await page.getByRole('button',{name:'Skip this step'}).click();             // skills
  await page.getByRole('button',{name:'Skip this step'}).click();             // summary
  await page.getByRole('heading',{name:'Your CV is ready to review'}).waitFor();await audit(page,'finish '+w);
  // a failed save keeps the answers and says so
  await page.evaluate(()=>{window.failSave=true});await page.getByRole('button',{name:'Save my CV'}).click();
  await page.waitForFunction(()=>/Not saved/.test(document.getElementById('app').innerText));
  assert.match(await page.locator('[role=alert]').last().innerText(),/answers are still here/);
  await page.evaluate(()=>{window.failSave=false});await page.getByRole('button',{name:'Save my CV'}).click();
  await page.waitForFunction(()=>window.saved.length===1);
  const saved=await page.evaluate(()=>window.saved[0]);
  assert.equal(saved.document.personalInfo.firstName,'Ama');assert.equal(saved.document.experience[0].employer,'Acme Stores');assert.equal(saved.document.experience[0].current,true);
  assert.equal(await page.evaluate(()=>window.draft),null,'draft cleared after saving');
  assert.deepEqual(errors,[]);assert.deepEqual(reqs,[],'no external requests');
  await ctx.close();
  // with an existing CV: improve and tailor journeys
  const c2=await browser.newContext({viewport:vp}),p2=await c2.newPage();
  await p2.goto('http://localhost:'+port+'/?doc=1&nodraft=1');await p2.waitForFunction(()=>window.ready);
  assert.match(await p2.locator('#app').innerText(),/not available here/);
  await audit(p2,'entry (with CV) '+w);
  await p2.getByRole('button',{name:'Improve my CV'}).click();await p2.getByRole('heading',{name:'Ways to improve your CV'}).waitFor();await audit(p2,'improve '+w);
  assert.match(await p2.locator('#app').innerText(),/not a score/i);
  await p2.getByRole('button',{name:'Stop and finish later'}).click();
  await p2.getByRole('button',{name:'Tailor to a job'}).click();
  await type(p2,'Job advert text','Supervisor\nRequirements\n- Stock control\n- Cooking experience');await p2.getByRole('button',{name:'Next'}).click();
  await p2.getByRole('heading',{name:'How your CV matches this job'}).waitFor();await audit(p2,'tailor results '+w);
  assert.match(await p2.locator('#app').innerText(),/does not mean you lack/);
  // import journey review
  await p2.getByRole('button',{name:'Stop and finish later'}).click();await p2.getByRole('button',{name:'Import my old CV'}).click();
  await type(p2,'CV text','Grace Hopper\ngrace@example.test\n\nExperience\nSenior Engineer at Navy Labs\nJan 2018 - Present\n- Led compiler team.\n');await p2.getByRole('button',{name:'Next'}).click();
  await p2.getByRole('heading',{name:'Check what we found'}).waitFor();await audit(p2,'import review '+w);
  await p2.getByLabel(/Job: Senior Engineer/).uncheck();await p2.getByRole('button',{name:'Next'}).click();
  await p2.getByRole('button',{name:'Save my CV'}).click();await p2.waitForFunction(()=>window.saved.length===1);
  const imp=await p2.evaluate(()=>window.saved[0]);assert.equal(imp.document.experience.length,0,'unticked item is left out');assert.equal(imp.document.personalInfo.firstName,'Grace');
  await p2.evaluate(()=>window.reg.unmount('onboarding'));assert.equal(await p2.locator('.ledger-onboarding').count(),0);
  await c2.close();console.log('PASS onboarding + a11y audit at',w);
 }
}catch(e){failed=true;console.error(e);}finally{await browser.close();close();}
process.exit(failed?1:0);

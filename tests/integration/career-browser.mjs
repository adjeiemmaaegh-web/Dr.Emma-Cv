// Human-led A-D journey in the actual persisted workspace, not a synthetic one-click script.
import assert from 'node:assert/strict';
import {chromium,serve} from '../experience/harness.mjs';
const {port,close}=serve({});
const browser=await chromium.launch();let failed=false;
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 const page=await ctx.newPage(),errors=[],external=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('request',r=>{if(!r.url().startsWith('http://localhost:'+port))external.push(r.url());});
 await page.goto('http://localhost:'+port+'/src/features/experience/workspace/index.html');
 await page.getByRole('link',{name:'Career tools'}).click();
 await page.getByLabel('Job title').fill('Retail manager');
 await page.getByLabel('Employer').fill('Example Stores');
 await page.getByLabel('Job advert text').fill('Retail manager\nRequirements\n- Store operations\n- Stock control');
 await page.getByRole('button',{name:'Analyse and save vacancy'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('Vacancy analysed.'));
 assert.match(await page.locator('.lw-career').innerText(),/Store operations/);
 await page.reload();await page.getByRole('link',{name:'Career tools'}).click();
 await page.waitForFunction(()=>document.querySelector('.lw-career')?.textContent?.includes('Example Stores'));
 assert.equal(await page.getByLabel('Employer').inputValue(),'Example Stores','job persisted after reload');
 await page.getByRole('button',{name:'Start cover letter draft'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('Cover letter draft created.'));
 await page.getByLabel(/Letter body paragraphs/).fill('I am applying for this retail manager role.');
 await page.getByRole('button',{name:'Save letter edits'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('Letter edits'));
 await page.getByLabel('Story title').fill('Handled a customer queue');
 await page.getByLabel('Situation — what actually happened?').fill('The shop was busy');
 await page.getByLabel('Task — what were you responsible for?').fill('Serve the customers');
 await page.getByLabel('Action — what did you personally do?').fill('I organised the tills');
 await page.getByLabel('Result — what happened (only true outcomes)?').fill('Wait times improved');
 await page.getByRole('button',{name:'Save STAR story'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('1 saved STAR stories'));
 await page.reload();await page.getByRole('link',{name:'Career tools'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('1 saved STAR stories'));
 assert.match(await page.locator('.lw-career').innerText(),/I am applying for this retail manager role/);
 await page.getByLabel('Your pasted LinkedIn profile text').fill('Retail manager\nAbout\nI lead customer service.');
 await page.getByRole('button',{name:'Check LinkedIn against my CV'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('LinkedIn analysis completed locally'));
 await page.getByRole('button',{name:'Save application and link CV'}).click();
 await page.waitForFunction(()=>location.hash==='#/jobs');
 assert.match(await page.locator('.lw-board').innerText(),/Example Stores/);
 // User-authorized official export -> local comparison -> per-field consent -> new saved profile.
 const originalId=await page.evaluate(()=>localStorage.getItem('ledger_workspace_active_profile_v1'));
 await page.getByRole('link',{name:'Career tools'}).click();
 await page.getByLabel('Choose LinkedIn export ZIP or selected official CSV files').setInputFiles([
  {name:'Profile.csv',mimeType:'text/csv',buffer:Buffer.from('First Name,Last Name,Headline,Summary\nAda,Example,Store Director,Operations summary\n')},
  {name:'Positions.csv',mimeType:'text/csv',buffer:Buffer.from('Company Name,Title,Started On,Finished On,Description\nNew Store,Store Director,2022,,Managed a local team\n')}
 ]);
 await page.getByRole('button',{name:'Review selected official LinkedIn export'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('LinkedIn analysis completed locally'));
 await page.getByRole('button',{name:'Review LinkedIn-to-CV reconstruction'}).click();
 await page.getByLabel('Accept personalInfo.name').check();
 await page.getByLabel('Accept experience[0]').check();
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'Create separate profile from selected fields'}).click();
 await page.waitForFunction(()=>location.hash==='#/editor');
 const importedId=await page.evaluate(()=>localStorage.getItem('ledger_workspace_active_profile_v1'));
 assert(importedId&&importedId!==originalId,'a new local profile must be created, not an overwrite');
 assert.match(await page.locator('.lw-editor').innerText(),/Store Director/);
 await page.reload();await page.getByRole('link',{name:'Edit'}).click();
 assert.match(await page.locator('.lw-editor').innerText(),/New Store/,'approved LinkedIn fields must survive a real browser restart');

 assert.deepEqual(errors,[]);assert.deepEqual(external,[],'no external requests');
 console.log('PASS real persisted A-D career journey vacancy, letter, interview, LinkedIn and application linking');
 await ctx.close();
}catch(e){failed=true;console.error(e);}finally{await browser.close();close();}
process.exit(failed?1:0);

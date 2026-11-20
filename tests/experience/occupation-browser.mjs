/** Smoke the real rendered occupation UX, not just the pure content registry.
 * Use sample-only workspace; no account, public deployment or user CV touched.
 */
import assert from 'node:assert/strict';
import {chromium,serve} from './harness.mjs';
const {port,close}=serve({});
const browser=await chromium.launch();
const origin='http://localhost:'+port+'/src/features/experience/workspace/index.html?sample=1';
const p=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[];p.on('pageerror',e=>errors.push(String(e)));
let allowReplace=false,replaceDialogs=0;
p.on('dialog',async d=>{replaceDialogs++;if(allowReplace)await d.accept();else await d.dismiss();});
try{
 await p.goto(origin);
 await p.getByRole('link',{name:'Edit',exact:true}).click();
 await p.locator('.lw-occupation-picker select[aria-label="Occupation category"]').selectOption('cleaning');
 assert.equal(await p.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Occupation category','picker retains keyboard focus after change');
 assert(await p.locator('details[data-sec="summary"]').evaluate(node=>node.open),
  'choosing a category must reveal summary examples');
 assert(await p.locator('details[data-sec="skills"]').evaluate(node=>node.open),
  'choosing a category must reveal suggested skills');
 await p.waitForFunction(()=>document.querySelector('[data-suggestion-kind="summary"] .lw-suggestion-list')?.children.length===25);
 assert.equal(await p.locator('[data-suggestion-kind="summary"] .lw-suggestion-choice').count(),25);
 const summary=p.locator('[data-path="summary"]').first();
 const original=await summary.inputValue();
 await p.locator('[data-suggestion-kind="summary"] .lw-suggestion-choice').first().click();
 assert.equal(await summary.inputValue(),original,'cancelling replacement must preserve the user summary');
 assert.equal(replaceDialogs,1,'existing summary requires explicit confirmation');
 allowReplace=true;
 await p.locator('[data-suggestion-kind="summary"] .lw-suggestion-choice').first().click();
 assert.match(await summary.inputValue(),/Reliable cleaning professional/);
 const summaryCards=p.locator('[data-suggestion-kind="summary"] .lw-suggestion-choice');
 assert.equal(await summaryCards.first().getAttribute('data-selected'),'true','selected summary card switches to Remove');
 assert.equal(await summaryCards.first().locator('.lw-suggestion-action').innerText(),'Remove');
 assert.equal(await summaryCards.first().getAttribute('aria-pressed'),'true');
 assert.equal(await summaryCards.first().locator('.lw-suggestion-action').evaluate(e=>getComputedStyle(e).writingMode),'vertical-rl',
  'ribbon follows the screenshot vertical Add/Remove design');
 await summaryCards.first().click();
 assert.equal(await summary.inputValue(),'','Remove only the selected replacement summary');
 assert.equal(await summaryCards.first().getAttribute('data-selected'),'false','card switches back to Add');
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 assert.match(await summary.inputValue(),/Reliable cleaning professional/,'Undo restores removed summary');
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await summary.inputValue(),original,'Undo restores the pre-replacement summary');
 await p.locator('input[aria-label="Add selected summary to existing text instead of replacing"]').check();
 await p.locator('[data-suggestion-kind="summary"] .lw-suggestion-choice').first().click();
 await p.locator('[data-suggestion-kind="summary"] .lw-suggestion-choice').nth(1).click();
 assert.match(await summary.inputValue(),/Detail-focused cleaner/,'second selected summary appended');
 assert.equal(await summaryCards.first().getAttribute('data-selected'),'true');
 assert.equal(await summaryCards.nth(1).getAttribute('data-selected'),'true');
 await summaryCards.first().click();
 assert.doesNotMatch(await summary.inputValue(),/Reliable cleaning professional/,'remove first selection only');
 assert.match(await summary.inputValue(),/Detail-focused cleaner/,'keep second selected summary');
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await summaryCards.first().getAttribute('data-selected'),'true','Undo restores selected card state');
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await summary.inputValue(),original,'two appended summaries are undoable independently');
 const skillsSection=p.locator('details[data-sec="skills"]');
 if(!(await skillsSection.evaluate(node=>node.open)))await skillsSection.locator('summary').click();
 const skillSearch=skillsSection.locator('input[aria-label="Search skills examples"]');
 await skillSearch.fill('commercial');
 const skillCard=skillsSection.locator('[data-suggestion-kind="skills"] .lw-suggestion-choice').first();
 await skillCard.click();
 assert.equal(await skillSearch.inputValue(),'commercial','filter remains after the skill collection re-renders');
 assert(await skillCard.evaluate(node=>node===document.activeElement),'keyboard focus remains on selected card after rebuild');
 await p.waitForFunction(()=>[...document.querySelectorAll('.lw-chip')].some(x=>x.textContent.includes('Commercial Cleaning')));
 assert.equal(await skillCard.getAttribute('data-selected'),'true','Add toggles the skill card to Remove');
 await skillCard.click();
 await p.waitForFunction(()=>![...document.querySelectorAll('.lw-chip')].some(x=>x.textContent.includes('Commercial Cleaning')));
 assert.equal(await skillCard.getAttribute('data-selected'),'false');
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await skillCard.getAttribute('data-selected'),'true','Undo restores skill and selected ribbon');
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await skillCard.getAttribute('data-selected'),'false');
 const expSection=p.locator('details[data-sec="experience"]');
 if(!(await expSection.evaluate(node=>node.open)))await expSection.locator('summary').click();
 assert(await expSection.evaluate(node=>node.open),'work experience is expanded before changing its category');
 const card=p.locator('.lw-item[data-entry-section="experience"]').first();
 assert.equal(await card.locator('[data-suggestion-kind="duties"] .lw-suggestion-choice').count(),0,
  'unknown work role must not inherit a different target occupation');
 const roleSelect=card.locator('[data-work-category]');
 if(!(await roleSelect.isVisible())){
  const ancestors=await roleSelect.evaluate(el=>{
   const out=[];for(let n=el;n&&out.length<12;n=n.parentElement){
    const st=getComputedStyle(n);
    out.push({tag:n.tagName,class:n.className,open:n.open||false,display:st.display,visibility:st.visibility,hidden:n.hidden||false});
   }return out;
  });
  throw new Error('Work category must be visible before selection; ancestors='+JSON.stringify(ancestors));
 }
 await roleSelect.selectOption('cleaning');
 assert.equal(await card.locator('[data-suggestion-kind="duties"] .lw-suggestion-choice').count(),24,
  'explicit category enables examples for an otherwise unknown work title');
 await card.locator('[data-work-category]').selectOption('');
 assert.equal(await card.locator('[data-suggestion-kind="duties"] .lw-suggestion-choice').count(),0,
  'clearing the category removes unrelated suggestions');
 await card.locator('input[data-path$=".title"]').fill('Cleaner');
 await card.locator('input[data-path$=".title"]').press('Tab');
 assert.equal(await card.locator('[data-work-category]').inputValue(),'cleaning',
  'work-specific title selects the right duties category');
 const descriptions=card.locator('textarea[data-path$=".description"]');
 const before=await descriptions.inputValue();
 const dutyCard=card.locator('[data-suggestion-kind="duties"] .lw-suggestion-choice').first();
 await dutyCard.click();
 assert.notEqual(await descriptions.inputValue(),before,'work duty must be inserted');
 assert.equal(await dutyCard.getAttribute('data-selected'),'true','duty card shows Remove after adding');
 await dutyCard.click();
 assert.equal(await descriptions.inputValue(),before,'Remove keeps unrelated work duties intact');
 assert.equal(await dutyCard.getAttribute('data-selected'),'false','duty card returns to Add');
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await dutyCard.getAttribute('data-selected'),'true','Undo restores removed duty');
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await descriptions.inputValue(),before,'duties must be undoable');
 // Exact role choice changes the top examples without writing the CV title.
 await p.locator('.lw-occupation-picker select[aria-label="Occupation category"]').selectOption('retail');
 await p.locator('.lw-occupation-picker select[aria-label="Occupation or job title"]').selectOption('Cashier');
 assert.match(await p.locator('[data-suggestion-kind="summary"] .lw-suggestion-body').first().innerText(),
  /Customer-facing cashier focused on accurate transactions/);
 assert.equal(await p.locator('input[data-path="personalInfo.title"]').count(),1);
 const untouchedTitle=await p.locator('input[data-path="personalInfo.title"]').inputValue();
 assert.equal(untouchedTitle,'Operations Manager','browsing roles never rewrites the CV title');
 // These two skills are explicitly entered; do not infer any employer, tenure or achievements.
 await p.locator('#f-newskill').fill('Checkout Transactions');
 await p.locator('#f-newskill').press('Enter');
 await p.locator('#f-newskill').fill('Till Reconciliation');
 await p.locator('#f-newskill').press('Enter');
 assert.match(await p.locator('[data-suggestion-kind="summary"] .lw-suggestion-body').first().innerText(),
  /Interested in Cashier opportunities, with 2 relevant skills listed in this CV/);
 assert.equal(await p.locator('textarea[data-path="summary"]').inputValue(),original,
  'locally personalized suggestions never overwrite the editable summary without a click');
 assert.deepEqual(errors,[]);

 await p.goto(origin);
 await p.getByRole('button',{name:'Create a CV'}).click();
 for(const [n,v] of [['firstName','Ada'],['lastName','Example'],['email','ada@example.test']])
  await p.locator('form [name="'+n+'"]').fill(v);
 await p.getByRole('button',{name:'Next'}).click();
 await p.locator('form .lw-occupation-picker select[aria-label="Occupation category"]').selectOption('cleaning');
 await p.locator('form .lw-occupation-picker select[aria-label="Occupation or job title"]').selectOption('Cleaner');
 assert.equal(await p.locator('form [name="title"]').inputValue(),'Cleaner');
 await p.getByRole('button',{name:'Next'}).click();
 assert.equal(await p.locator('[data-suggestion-kind="duties"] .lw-suggestion-choice').count(),0,
  'target Cleaner must not suggest past work duties until an actual previous title is entered');
 await p.locator('form [name="jobTitle"]').fill('Cashier');
 await p.locator('form [name="jobTitle"]').press('Tab');
 await p.waitForFunction(()=>document.querySelector('[data-suggestion-kind="duties"] .lw-suggestion-choice'));
 assert.match(await p.locator('[data-suggestion-kind="duties"] .lw-suggestion-body').first().innerText(),
  /Processed customer payments and provided accurate receipts/);
 const beginnerDuty=p.locator('[data-suggestion-kind="duties"] .lw-suggestion-choice').first();
 await beginnerDuty.click();
 assert((await p.locator('form [name="achievements"]').inputValue()).length>40);
 assert.equal(await beginnerDuty.getAttribute('data-selected'),'true');
 await beginnerDuty.click();
 assert.equal(await p.locator('form [name="achievements"]').inputValue(),'','guided removal restores empty duty draft');
 await beginnerDuty.click();
 await p.locator('form [name="employer"]').fill('Example Services');
 await p.locator('form [name="start"]').fill('Jan 2023');
 await p.locator('form [name="current"]').check();
 await p.getByRole('button',{name:'Next'}).click();
 await p.getByRole('button',{name:'Skip this step'}).click();
 const beginnerSkill=p.locator('[data-suggestion-kind="skills"] .lw-suggestion-choice').first();
 await beginnerSkill.click();
 assert.match(await p.locator('form [name="skills"]').inputValue(),/Cleaning Checklists/);
 assert.equal(await beginnerSkill.getAttribute('data-selected'),'true');
 await beginnerSkill.click();
 assert.doesNotMatch(await p.locator('form [name="skills"]').inputValue(),/Cleaning Checklists/);
 await beginnerSkill.click();
 await p.getByRole('button',{name:'Next'}).click();
 assert.equal(await p.locator('[data-suggestion-kind="summary"] .lw-suggestion-choice').count(),25);
 const beginnerSummary=p.locator('[data-suggestion-kind="summary"] .lw-suggestion-choice').first();
 await beginnerSummary.click();
 assert.match(await p.locator('form [name="summary"]').inputValue(),/Cleaning professional focused on consistent room standards/);
 assert.equal(await beginnerSummary.getAttribute('data-selected'),'true');
 await beginnerSummary.click();
 assert.equal(await p.locator('form [name="summary"]').inputValue(),'');
 await beginnerSummary.click();
 assert.match(await p.locator('form [name="summary"]').inputValue(),/Cleaning professional focused on consistent room standards/);
 assert.deepEqual(errors,[]);
 console.log('PASS: exact-role editorial summaries, local skill-backed personalization, non-inherited past duties, add/remove and undo');
}finally{await browser.close();await close();}

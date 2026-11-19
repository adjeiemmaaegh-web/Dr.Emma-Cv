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
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await summary.inputValue(),original,'summary selection must be undoable');
 await p.locator('input[aria-label="Add selected summary to existing text instead of replacing"]').check();
 await p.locator('[data-suggestion-kind="summary"] .lw-suggestion-choice').first().click();
 await p.locator('[data-suggestion-kind="summary"] .lw-suggestion-choice').nth(1).click();
 assert.match(await summary.inputValue(),/Detail-focused cleaner/,'second selected summary appended');
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await summary.inputValue(),original,'two appended summaries are undoable independently');
 const skillsSection=p.locator('details[data-sec="skills"]');
 if(!(await skillsSection.evaluate(node=>node.open)))await skillsSection.locator('summary').click();
 await skillsSection.locator('[data-suggestion-kind="skills"] .lw-suggestion-choice').first().click();
 await p.waitForFunction(()=>[...document.querySelectorAll('.lw-chip')].some(x=>x.textContent.includes('Commercial Cleaning')));
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 const expSection=p.locator('details[data-sec="experience"]');
 if(!(await expSection.evaluate(node=>node.open)))await expSection.locator('summary').click();
 assert(await expSection.evaluate(node=>node.open),'work experience is expanded before changing its category');
 const card=p.locator('.lw-item[data-entry-section="experience"]').first();
 assert.equal(await card.locator('[data-suggestion-kind="duties"] .lw-suggestion-choice').count(),0,
  'unknown work role must not inherit a different target occupation');
 await card.locator('[data-work-category]').selectOption('cleaning');
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
 await card.locator('[data-suggestion-kind="duties"] .lw-suggestion-choice').first().click();
 assert.notEqual(await descriptions.inputValue(),before,'work duty must be inserted');
 await p.getByRole('button',{name:'Undo',exact:true}).click();
 assert.equal(await descriptions.inputValue(),before,'duties must be undoable');
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
 assert((await p.locator('[data-suggestion-kind="duties"] .lw-suggestion-choice').count())>=24);
 await p.locator('[data-suggestion-kind="duties"] .lw-suggestion-choice').first().click();
 assert((await p.locator('form [name="achievements"]').inputValue()).length>40);
 await p.locator('form [name="jobTitle"]').fill('Cleaner');
 await p.locator('form [name="employer"]').fill('Example Services');
 await p.locator('form [name="start"]').fill('Jan 2023');
 await p.locator('form [name="current"]').check();
 await p.getByRole('button',{name:'Next'}).click();
 await p.getByRole('button',{name:'Skip this step'}).click();
 await p.locator('[data-suggestion-kind="skills"] .lw-suggestion-choice').first().click();
 assert.match(await p.locator('form [name="skills"]').inputValue(),/Commercial Cleaning/);
 await p.getByRole('button',{name:'Next'}).click();
 assert.equal(await p.locator('[data-suggestion-kind="summary"] .lw-suggestion-choice').count(),25);
 await p.locator('[data-suggestion-kind="summary"] .lw-suggestion-choice').first().click();
 assert.match(await p.locator('form [name="summary"]').inputValue(),/Reliable cleaning professional/);
 assert.deepEqual(errors,[]);
 console.log('PASS: occupation chooser, 25 summaries, skills, duties, undo, guided journey');
}finally{await browser.close();await close();}

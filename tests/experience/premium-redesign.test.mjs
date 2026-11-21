import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');

test('premium stylesheet is included in the workspace and hosted build',()=>{
 const html=read('src/features/experience/workspace/index.html');
 const build=read('tools/build-workspace-vercel.mjs');
 assert.match(html,/href="\.\/premium-editorial\.css"/);
 assert.match(build,/premium-editorial\.css/);
 assert.match(build,/\/src\/features\/experience\/workspace\/premium-editorial\.css/);
});

test('homepage uses a fictional CV, clearly labelled ATS demo and no fake template bars',()=>{
 const views=read('src/features/experience/workspace/views.mjs');
 const preview=read('src/features/experience/workspace/preview.mjs');
 const css=read('src/features/experience/workspace/premium-editorial.css');
 const baseCss=read('src/features/experience/workspace/workspace.css');
 assert.match(views,/const exampleLayout=layoutFor\(featuredDocument\(HERO_CV\),exampleAppearance\)/);
 assert.match(views,/HERO_CV\.first\+' '\+HERO_CV\.last/);
 assert.match(views,/class:'lw-showcase-person'/);
 assert.match(views,/class:'lw-featured-excerpt'/);
 assert.match(views,/thumbnail\(exampleLayout\)/);
 assert.match(views,/class:'lw-hero-stage'/);
 assert.match(views,/class:'lw-showcase-ats'/);
 assert.match(views,/Fictional CV and illustrative ATS result/);
 assert.match(views,/FEATURED_CVS\.map\(example=>/);
 assert.match(views,/class:'lw-featured-track'/);
 assert.match(views,/Show earlier CV designs/);
 assert.match(views,/Show later CV designs/);
 assert.match(views,/lw-featured-section/);
 assert.match(preview,/class:'lw-thumb-text'/);
 assert.match(preview,/fontSize=\(l\.size\/paper\.width\*100\)/);
 assert.match(baseCss,/container-type:inline-size/);
 assert.match(css,/lw-showcase-document/);
 assert.match(css,/\.lw\[data-theme=dark\] \.lw-hero \.lw-showcase-ats p\{color:#176858\}/);
 assert.match(css,/grid-auto-columns:minmax\(0,calc\(\(100% - 40px\)\/3\)\)/);
 assert.match(css,/scroll-snap-type:x mandatory/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/lw-featured-arrow:focus-visible/);
 assert.doesNotMatch(views,/class:'lw-hero-paper'/);
});

test('CV thumbnails expose actual sample text in scaled positioned DOM',async()=>{
 const {thumbnail,layoutFor}=await import('../../src/features/experience/workspace/preview.mjs');
 const {SAMPLE_DOC}=await import('../../src/features/experience/workspace/store.mjs');
 const {TEMPLATES}=await import('../../src/features/templates/registry.mjs');
 const previous=globalThis.document;
 const mk=tag=>({tag,nodeType:1,children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v;},append(...children){this.children.push(...children);}});
 globalThis.document={createElement:mk,createTextNode:text=>({nodeType:3,textContent:String(text)})};
 try{
  const snap=layoutFor(SAMPLE_DOC(),{template:TEMPLATES[0].id});
  const thumb=thumbnail(snap);
  const texts=thumb.children.filter(x=>x.tag==='span').map(x=>({text:x.children.map(c=>c.textContent).join(''),style:x.attrs.style||''}));
  assert.ok(texts.length>10,'renders actual placed text from the CV document');
  assert.ok(texts.some(x=>x.text.includes('Ada')||x.text.includes('Example')),'includes fictional person name');
  assert.ok(texts.some(x=>x.text.includes('Operations')),'includes fictional experience or job title');
  assert.ok(texts.every(x=>x.style.includes('cqw')),'every text element scales with its preview width');
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});

test('Don Doe hero displays a genuinely populated fictional CV, not an empty document',async()=>{
 const {HERO_CV,featuredDocument}=await import('../../src/features/experience/workspace/showcase-samples.mjs');
 const {layoutFor}=await import('../../src/features/experience/workspace/preview.mjs');
 assert.equal(HERO_CV.first,'Don');
 assert.equal(HERO_CV.last,'Doe');
 const doc=featuredDocument(HERO_CV);
 assert.equal(doc.personalInfo.firstName,'Don');
 assert.equal(doc.personalInfo.lastName,'Doe');
 assert.equal(doc.personalInfo.photo,'');
 assert.ok(doc.summary.includes('Operations manager'));
 assert.ok(doc.experience.length>=2);
 assert.ok(doc.education.length>=1);
 assert.ok(doc.skills.length>=4);
 const result=layoutFor(doc,{template:HERO_CV.style,color:HERO_CV.color,paper:'A4'});
 const lines=result.pages.flat().map(l=>String(l.text));
 assert.ok(lines.some(t=>t.toLowerCase().includes('don doe')),'name prints inside the document preview');
 assert.ok(lines.some(t=>t.includes('Operations Manager')),'role prints inside the document preview');
 assert.ok(lines.some(t=>t.includes('Summit Retail Group')),'fictional experience prints inside the document preview');
 assert.ok(lines.some(t=>t.includes('Business Management')),'fictional education prints inside the document preview');
 const css=read('src/features/experience/workspace/premium-editorial.css');
 assert.match(css,/\.lw-showcase-person strong\{font-size:1\.05rem/);
 assert.match(css,/\.lw-featured-excerpt p\{font-size:\.89rem/);
});

test('six curated CVs are distinct, fictional, export-layout-compatible and without remote portraits',async()=>{
 const {FEATURED_CVS,featuredDocument}=await import('../../src/features/experience/workspace/showcase-samples.mjs');
 const {getTemplate}=await import('../../src/features/templates/registry.mjs');
 const {layoutFor}=await import('../../src/features/experience/workspace/preview.mjs');
 assert.equal(FEATURED_CVS.length,6);
 assert.equal(new Set(FEATURED_CVS.map(e=>e.style)).size,6);
 assert.equal(new Set(FEATURED_CVS.map(e=>e.role)).size,6);
 const seen=new Set();
 for(const e of FEATURED_CVS){
  assert.equal(getTemplate(e.style).id,e.style,'showcase uses actual registered template');
  const doc=featuredDocument(e);
  const name=doc.personalInfo.firstName+' '+doc.personalInfo.lastName;
  assert.ok(!seen.has(name),'unique fictional sample name');seen.add(name);
  assert.ok(doc.summary.length>40&&doc.experience.length>=2&&doc.skills.length>=4);
  assert.equal(doc.personalInfo.photo,'','decorative identifiers must not imply photo export');
  assert.equal(doc.personalInfo.email,'sample@example.test');
  const layout=layoutFor(doc,{template:e.style,color:e.color});
  assert.ok(layout.pages.length>=1);
  assert.ok(layout.pages[0].some(line=>String(line.text).toLowerCase().includes(e.first.toLowerCase())),'CV name is in page layout (including executive uppercase styles)');
  assert.ok(layout.pages[0].some(line=>String(line.text).includes(e.role)),'CV role is in page layout');
 }
});

test('template gallery uses live registry count and batches DOM updates',()=>{
 const views=read('src/features/experience/workspace/views.mjs');
 const start=views.indexOf('export function templatesView');
 const end=views.indexOf('/* ====================== Check',start);
 assert.ok(start>=0&&end>start);
 const gallery=views.slice(start,end);
 assert.match(gallery,/TEMPLATES\.length\+' templates'/);
 assert.match(gallery,/document\.createDocumentFragment\(\)/);
 assert.match(gallery,/grid\.append\(fragment\)/);
 assert.match(gallery,/confirmDesignEditing\(ctx\)/);
});

test('premium editor provides keyboard focus and narrow-screen layout',()=>{
 const css=read('src/features/experience/workspace/premium-editorial.css');
 assert.match(css,/focus-visible/);
 assert.match(css,/\.lw-editor\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(css,/\.lw\[data-theme=dark\]/);
});

test('offline update manager rechecks waiting worker without skipping unsaved work',async()=>{
 const {createUpdateManager}=await import('../../src/features/pwa-ui/update-manager.mjs');
 let waiting=null,posted=0;
 const registration={get waiting(){return waiting;},addEventListener(){}};
 const serviceWorker={controller:{},addEventListener(){}};
 let dirty=true;
 const manager=createUpdateManager({registration,serviceWorker,hasUnsavedWork:()=>dirty});
 assert.equal(manager.getState().status,'idle');
 waiting={postMessage(){posted++;}};
 assert.equal(manager.getState().status,'available');
 assert.deepEqual(manager.apply(),{ok:false,reason:'unsaved'});
 assert.equal(posted,0);
 dirty=false;
 assert.deepEqual(manager.apply(),{ok:true});
 assert.equal(posted,1);
 assert.equal(manager.getState().status,'applying');
});

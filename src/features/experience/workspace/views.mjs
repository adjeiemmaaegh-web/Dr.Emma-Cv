/** Workspace views. Each returns {node, destroy?}. They only use other workstreams' public APIs. */
import {el,icon,download,debounceFrame} from './ui.mjs';
import {OCCUPATION_CATEGORIES,resolveOccupation,occupationContent,addUniqueSkill,appendUniqueDuty,mergeSummary,hasSuggestedSummary,removeSuggestedSummary,hasSuggestedDuty,removeSuggestedDuty} from '../../occupation/occupation-content.mjs';
import {occupationPicker,suggestionList} from '../../occupation/occupation-ui.mjs';
import {layoutFor,drawPages,thumbnail} from './preview.mjs';
import {listTemplates,FAMILIES,applyTemplate,getTemplate,OPTIONS,TEMPLATES,resolveStyle} from '../../templates/registry.mjs';
import {renderDocumentArtifact} from '../../export/export-service.mjs';
import {runAtsChecks,analyzeWriting,analyzeResumeReadiness} from '../../intelligence/index.mjs';
import * as T from '../../tracker/tracker.mjs';
import {exportCsv,exportBook} from '../../tracker/io.mjs';
import {onboardingFeature} from '../../onboarding/onboarding-module.mjs';
import {assessStorageHealth,collectStorageSignals} from '../../pwa-ui/status.mjs';
import {SAMPLE_DOC} from './store.mjs';
import {HERO_CV,FEATURED_CVS,featuredDocument} from './showcase-samples.mjs';
import {createWorkspaceDataPanel} from './data-panel.mjs';
import {communityGuide} from './community-guide.mjs';
import {designControls,sectionsControls,saveDesignControls,savedDesignGallery,quickEditOnPage,fieldAtPath,confirmDesignEditing} from './design-studio.mjs';
const variantOf=ed=>{const s=ed.snapshot();return {id:'workspacePreview1',revision:0,name:'CV',document:s.document,appearance:s.appearance};};
export const ACCENTS=['#0b6b72','#c85a34','#3b5ba9','#8a5a3b','#4a4a4a','#7a3e9d'];
const fileName=(doc,ext)=>([doc.personalInfo.firstName,doc.personalInfo.lastName,'CV'].filter(Boolean).join('_')||'CV')+'.'+ext;
export function exportAs(ctx,format){
 const v=variantOf(ctx.store.editor);
 if(!ctx.store.hasContent()){ctx.toast('Add some details to your CV before downloading.');return;}
 try{const a=renderDocumentArtifact(v,format);download(a.bytes,fileName(v.document,format),a.mime);
  ctx.toast('Downloaded '+fileName(v.document,format)+(a.warnings.length?'. Note: '+a.warnings[0]:''));}
 catch(e){ctx.toast('Could not create the file: '+(e.message||'unknown problem'));}
}
/* ====================== Home ====================== */
export function homeView(ctx){
 const {store}=ctx,root=el('div'),cleanups=[];
 const has=store.hasContent();
 root.append(el('header',{class:'lw-page-head'},el('div',{},el('h1',{id:'page-title',tabindex:'-1'},has?'Welcome back':ctx.privateSession?'Private CV session':'Let’s build your CV'),
  el('p',{},has?'Pick up where you left off, check your CV, or track a new application.':ctx.privateSession?'Work without saving CV data in this browser. Download your file before leaving.':'Answer a few simple questions, or import the CV you already have. No account or payment is needed.')),
  has?el('div',{class:'lw-row'},el('a',{class:'lw-btn primary',href:'#/editor'},icon('edit'),'Continue editing'),el('button',{type:'button',class:'lw-btn',on:{click:()=>exportAs(ctx,'pdf')}},icon('download'),'Download PDF')):null));
 const grid=el('div',{class:'lw-grid',style:'margin-bottom:var(--s-5)'});
 if(has){
  const s=store.editor.snapshot(),lay=layoutFor(s.document,s.appearance);
  const r=runAtsChecks({document:s.document,appearance:s.appearance,artifact:{text:lay.text,pageCount:lay.pageCount,warnings:lay.warnings}});
  grid.append(el('section',{class:'lw-card','aria-labelledby':'h-cv'},el('h2',{id:'h-cv'},'Your CV'),
   el('div',{class:'lw-row',style:'margin:var(--s-3) 0'},el('span',{class:'lw-chip'},lay.pageCount+(lay.pageCount===1?' page':' pages')),el('span',{class:'lw-chip'},getTemplate(s.appearance.template).name),el('span',{class:'lw-chip'},s.appearance.paper)),
   el('p',{class:'lw-help'},r.counts.error+r.counts.warning===0?'No problems found by the local checks.':(r.counts.error+r.counts.warning)+' thing'+(r.counts.error+r.counts.warning===1?'':'s')+' worth fixing.'),
   el('p',{style:'margin-top:var(--s-3)'},el('a',{class:'lw-btn sm',href:'#/check'},'Review checks'))));
 }
 const sig=el('section',{class:'lw-card','aria-labelledby':'h-store'},el('h2',{id:'h-store'},'Your saved work'),el('p',{class:'lw-help'},'Checking…'));
 grid.append(sig);
 if(ctx.privateSession){
  sig.replaceChildren(el('h2',{id:'h-store'},'Unsaved private work'),
   el('p',{class:'lw-help'},'Nothing in this session is saved automatically. Download PDF or Word before closing; reloading starts a blank CV.'));
 }else collectStorageSignals({navigator:globalThis.navigator,location:globalThis.location,localStorage:globalThis.localStorage}).then(sg=>{
  sg.lastWriteError=store.status.error;const h=assessStorageHealth(sg);
  sig.replaceChildren(el('h2',{id:'h-store'},'Your saved work'),el('p',{style:'margin:var(--s-2) 0'},el('span',{class:'lw-chip '+(h.level==='ok'?'ok':h.level==='warning'?'warn':'err')},(h.level==='ok'?'✓ ':h.level==='warning'?'▲ ':'✖ ')+h.summary)),
   el('ul',{class:'lw-help',style:'padding-left:1.1rem;margin:0'},h.items.slice(0,3).map(i=>el('li',{},i.message))));
 }).catch(()=>{});
 grid.append(el('section',{class:'lw-card','aria-labelledby':'h-tip'},el('h2',{id:'h-tip'},'Tip'),el('p',{class:'lw-help'},'Use ',el('kbd',{},'Ctrl'),' + ',el('kbd',{},'K'),' to jump anywhere or run a command without leaving the keyboard.')));
 const hostBox=el('div');
 const sample=store.editor.snapshot();
 const exampleTemplate=getTemplate(HERO_CV.style);
 const exampleAppearance={...sample.appearance,template:exampleTemplate.id,color:HERO_CV.color,paper:'A4',font:'template',fontSize:'medium',spacing:'compact'};
 const exampleLayout=layoutFor(featuredDocument(HERO_CV),exampleAppearance);
 root.append(el('section',{class:'lw-hero','aria-label':'CV builder introduction'},
  el('div',{class:'lw-hero-copy'},
   el('p',{class:'lw-hero-eyebrow'},'THE CV BUILDER FOR YOUR NEXT CHAPTER'),
   el('h2',{},'A better CV. A brighter next step.'),
   el('p',{class:'lw-hero-lede'},'Build a beautifully presented CV with guided writing, real-time previews and professional templates. Make every application count.'),
   el('div',{class:'lw-row lw-hero-actions'},
    el('a',{class:'lw-btn primary',href:'#/editor'},has?'Continue building':'Create my CV'),
    el('a',{class:'lw-btn',href:'#/templates'},'Explore templates')),
   el('p',{class:'lw-hero-trust'},'38 professional designs · PDF and Word export · No account required')),
  el('div',{class:'lw-hero-stage',role:'img','aria-label':'Illustrative sample CV for Don Doe, Operations Manager, with a fictional example ATS checklist and application labels'},
   el('div',{class:'lw-showcase-ats'},
    el('div',{class:'lw-showcase-ats-eyebrow'},'ATS CHECK · DEMO'),
    el('div',{class:'lw-showcase-score'},el('strong',{},'85%'),el('span',{},'Example match')),
    el('div',{class:'lw-showcase-meter'},el('span',{})),
    el('div',{class:'lw-showcase-job'},el('span',{},'Job description'),el('strong',{},'Operations Manager')),
    el('p',{class:'lw-showcase-list-title'},'Sample review'),
    el('p',{class:'lw-showcase-check'},'✓ Experience and education listed'),
    el('p',{class:'lw-showcase-check'},'✓ Relevant operational skills'),
    el('p',{class:'lw-showcase-improve'},'＋ Add more measurable outcomes')),
   el('div',{class:'lw-showcase-document'},
    thumbnail(exampleLayout),
    el('div',{class:'lw-showcase-avatar','aria-hidden':'true'},HERO_CV.initials)),
   el('div',{class:'lw-showcase-person'},el('strong',{},HERO_CV.first+' '+HERO_CV.last),el('span',{},HERO_CV.role+' · Fictional CV')),
   el('span',{class:'lw-showcase-application lw-showcase-application-one'},'◆ Sample application · Northstar'),
   el('span',{class:'lw-showcase-application lw-showcase-application-two'},'◆ Sample application · Brightworks'),
   el('span',{class:'lw-showcase-disclaimer'},'Fictional CV and illustrative ATS result — not a real score'))));
 /* Six independent sample CVs make each design recognisable at first glance.
  * These are showroom fixtures, never the visitor's saved document.
  */
 const featuredCards=FEATURED_CVS.map(example=>{
  const template=getTemplate(example.style);
  const appearance={...sample.appearance,template:template.id,color:example.color,
   paper:'A4',font:'template',fontSize:'medium',spacing:'compact',
   headerStyle:'template',columns:'template',ruleStyle:'template',pageAccent:'template'};
  const layout=layoutFor(featuredDocument(example),appearance);
  return el('a',{class:'lw-featured-card lw-tpl',href:'#/templates',
   'aria-label':'Browse '+template.name+' template, shown with a fictional '+example.role+' CV'},
   el('div',{class:'lw-featured-paper'},thumbnail(layout)),
   el('div',{class:'lw-featured-person'},
    el('span',{class:'lw-featured-initials','aria-hidden':'true'},example.initials),
    el('div',{},el('strong',{},example.first+' '+example.last),el('span',{},example.role))),
   el('div',{class:'lw-featured-excerpt'},
    el('span',{class:'lw-featured-excerpt-label'},'CV EXAMPLE'),
    el('p',{},example.summary),
    el('span',{class:'lw-featured-excerpt-role'},example.jobs[0][0]+' · '+example.jobs[0][1])),
   el('div',{class:'lw-featured-meta'},
    el('span',{},template.name+' · '+example.family),
    el('span',{class:'lw-featured-link'},'Explore design ›')));
 });
 const featuredTrack=el('div',{class:'lw-featured-track',role:'region','aria-label':'Six sample CV designs',tabindex:'0'},...featuredCards);
 const slideFeatured=direction=>{
  const first=featuredCards[0];
  const cardWidth=first?.getBoundingClientRect().width||featuredTrack.clientWidth;
  const gap=Number.parseFloat(globalThis.getComputedStyle?.(featuredTrack)?.columnGap)||20;
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  featuredTrack.scrollBy({left:direction*(cardWidth+gap),behavior:reduced?'auto':'smooth'});
 };
 const previousFeatured=el('button',{type:'button',class:'lw-featured-arrow',
  'aria-label':'Show earlier CV designs',on:{click:()=>slideFeatured(-1)}},'‹');
 const nextFeatured=el('button',{type:'button',class:'lw-featured-arrow',
  'aria-label':'Show later CV designs',on:{click:()=>slideFeatured(1)}},'›');
 previousFeatured.disabled=true;
 const updateFeaturedArrows=()=>{
  previousFeatured.disabled=featuredTrack.scrollLeft<3;
  nextFeatured.disabled=featuredTrack.scrollLeft+featuredTrack.clientWidth>=featuredTrack.scrollWidth-3;
 };
 featuredTrack.addEventListener('scroll',updateFeaturedArrows,{passive:true});
 root.append(el('section',{class:'lw-featured-section','aria-label':'Featured CV templates'},
  el('div',{class:'lw-featured-head'},
   el('div',{},
    el('p',{class:'lw-featured-eyebrow'},'EXPLORE THE POSSIBILITIES'),
    el('h2',{},'A design for every story'),
    el('p',{class:'lw-help'},'Six different careers, six real template layouts. Every CV uses fictional sample details.')),
   el('div',{class:'lw-featured-actions'},
    el('a',{class:'lw-btn',href:'#/templates'},'View all 38 templates'),
    previousFeatured,nextFeatured)),
  featuredTrack,
  el('p',{class:'lw-featured-note'},'Illustrative profiles only. Choose any template to preview your own CV in the editor.')));
 root.append(el('section',{class:'lw-card lw-guided-start','aria-label':'Guided CV builder',style:'padding:clamp(24px,5vw,56px);border-radius:24px'},
  el('p',{class:'lw-help',style:'font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4756a8'},'YOUR NEXT OPPORTUNITY STARTS HERE'),
  el('h2',{style:'font-size:clamp(2rem,4vw,3.4rem);line-height:1.12;max-width:18ch;margin:.7rem 0'},'Create a CV that opens doors.'),
  el('p',{class:'lw-help',style:'font-size:1.08rem;max-width:58ch;margin-bottom:1.25rem'},'Choose a professional design, tell your story, and download a CV you are proud to share. Free to use, with no account required.'),
  el('div',{class:'lw-row',style:'margin-bottom:1.5rem;gap:12px;flex-wrap:wrap'},
   el('a',{class:'lw-btn primary',href:'#/templates'},'Explore CV templates'),
   el('a',{class:'lw-btn',href:'#/editor'},has?'Continue my CV':'Open CV editor')),
  hostBox));
 root.append(el('section',{class:'lw-card',style:'margin-top:var(--s-5)','aria-label':'How CV creation works'},
  el('h2',{},'Three simple steps'),
  el('div',{class:'lw-grid'},
   ...[['01','Choose a design','Browse CV templates and pick a style that fits your role.'],['02','Tell your story','Add your experience, education and skills with guided help.'],['03','Review and download','Check the finished CV, then export to PDF or Word.']].map(([n,t,d])=>el('div',{class:'lw-card'},el('span',{class:'lw-chip'},n),el('h3',{},t),el('p',{class:'lw-help'},d))))));
 root.append(communityGuide({privateSession:!!ctx.privateSession}));
 root.append(el('details',{class:'lw-card',style:'margin-top:var(--s-5)'},el('summary',{style:'cursor:pointer;font-weight:700'},'Saved work, storage and advanced recovery'),grid));
 if(store.mode==='persistent'){
  const panel=createWorkspaceDataPanel(ctx);root.append(panel.node);cleanups.push(()=>panel.destroy?.());
 }
 let cleanup=null;
 onboardingFeature.mount({host:{element:hostBox},services:{
  documentSource:{load:()=>store.hasContent()?{document:store.editor.snapshot().document,appearance:store.editor.snapshot().appearance}:null},
  documentSink:{save:async out=>{
    if(store.mode==='persistent'){
     if(store.selectedCV.id===store.profile.master.id&&!store.masterEditConfirmed&&store.hasContent()&&
      !confirm('Replace the current master CV with these reviewed answers? Tailored copies remain separate.'))
      throw Error('Master change not approved');
     store.confirmMasterEditing(true);
     await store.replaceDocument(out.document);
    }else store.replaceDocument(out.document);
    ctx.toast(ctx.privateSession?'CV created for this private session. Download it before leaving.':'Saved to this device.');ctx.go('#/editor');
   }},
  draftStore:ctx.draftStore,autoFocus:false}}).then(c=>{cleanup=c;});
 return {node:root,destroy:()=>{cleanup?.();cleanups.forEach(f=>f());}};
}
/* ====================== Editor ====================== */
const PERSONAL=[['firstName','First name','given-name'],['lastName','Last name','family-name'],['title','Professional title',''],['email','Email','email'],['phone','Phone','tel'],['city','City','address-level2'],['linkedin','LinkedIn',''],['website','Website','']];
const SECS={experience:{label:'Experience',fields:[['title','Job title'],['employer','Employer'],['start','Start'],['end','End'],['description','What you did','area']],add:'Add a job',name:i=>[i.title,i.employer].filter(Boolean).join(' at ')||'New job'},
 education:{label:'Education',fields:[['degree','Qualification'],['school','School'],['start','Start'],['end','End']],add:'Add education',name:i=>[i.degree,i.school].filter(Boolean).join(', ')||'New qualification'}};
export function editorView(ctx){
 const {store}=ctx;let ed=store.editor;
 let contentCategory='',contentRole='',appendSummarySelection=false; // UI-only selection; no CV change without explicit insertion.
 const workCategories=new Map(); // Explicit category override only for the corresponding work entry.
 const root=el('div'),status=el('span',{class:'lw-chip',role:'status'});
 const undo=el('button',{type:'button',class:'lw-btn icon','aria-label':'Undo',on:{click:()=>ed.undo()}},icon('undo')),redo=el('button',{type:'button',class:'lw-btn icon','aria-label':'Redo',on:{click:()=>ed.redo()}},icon('redo'));
 const seg=(label,key,opts,fmt=x=>x)=>{const g=el('div',{class:'lw-seg',role:'group','aria-label':label});
  for(const o of opts)g.append(el('button',{type:'button','data-v':o,'aria-pressed':'false',on:{click:()=>{const precise={fontSize:'bodySize',spacing:'leading',margins:'marginSize'}[key];
   ed.setAppearance(precise?{[key]:o,[precise]:null}:{[key]:o});}}},fmt(o)));return g;};
 const paperSeg=seg('Paper size','paper',OPTIONS.paper),zoomMode={fit:true};
 const zoomSeg=el('div',{class:'lw-seg',role:'group','aria-label':'Preview zoom'},['Fit','100%'].map(z=>el('button',{type:'button','aria-pressed':String(z==='Fit'),on:{click:()=>{zoomMode.fit=z==='Fit';for(const b of zoomSeg.children)b.setAttribute('aria-pressed',String(b.textContent===z));redraw();}}},z)));
 const tabs=el('div',{class:'lw-seg lw-tabs',role:'group','aria-label':'Show'},['Edit','Preview'].map(t=>el('button',{type:'button','aria-pressed':String(t==='Edit'),on:{click:()=>{wrap.dataset.tab=t.toLowerCase();for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.textContent===t));redraw();}}},t)));
 root.append(el('header',{class:'lw-page-head'},el('div',{},el('h1',{id:'page-title',tabindex:'-1'},'Edit your CV'),el('p',{},ctx.privateSession?'Private session: changes are NOT saved. Download PDF or Word before leaving. Verify the file before sending.':'Changes save locally. The live preview uses the same pagination and decoration geometry as the PDF; verify the final file’s fonts before sending.')),
  el('div',{class:'lw-row'},el('button',{type:'button',class:'lw-btn',on:{click:()=>exportAs(ctx,'docx')}},icon('download'),'Word'),el('button',{type:'button',class:'lw-btn primary',on:{click:()=>exportAs(ctx,'pdf')}},icon('download'),'PDF'))));
 if(store.mode==='persistent'){
   const cv=store.selectedCV,master=cv.id===store.profile.master.id;
   const consent=el('section',{class:'lw-card','aria-label':'Profile version and saving'},
    el('p',{},master?'Editing the master CV. Tailored copies remain independent.':'Editing tailored CV: '+cv.name+' (revision '+cv.revision+').'),
    master&&!store.masterEditConfirmed?
      el('button',{type:'button',class:'lw-btn primary',on:{click:()=>{
       if(!confirm('Allow editing the master CV? Every saved change creates a revision; existing tailored copies remain independent.'))return;
       store.confirmMasterEditing(true);consent.replaceChildren(el('p',{},'Master editing approved for this session. Changes save with revision protection.'));
      }}},'Confirm master editing'):null);
   root.append(consent);
  }
  root.append(el('div',{class:'lw-toolbar',role:'toolbar','aria-label':'Editor tools'},undo,redo,paperSeg,zoomSeg,tabs,el('span',{class:'spacer'},status)));
 const form=el('div',{class:'lw-editor-form'}),pages=el('div',{class:'lw-pages'});
 const metrics=el('p',{class:'lw-preview-metrics',role:'status','aria-live':'polite'},'Calculating pages…');
 const prevWrap=el('div',{class:'lw-preview-wrap',tabindex:'0',role:'region','aria-label':'CV preview'},metrics,pages);
 const wrap=el('div',{class:'lw-editor','data-tab':'edit'},el('div',{class:'lw-form-col'},form),el('div',{class:'lw-preview-col'},prevWrap));root.append(wrap);
 const field=(label,value,key,path,onInput,{area,auto}={})=>{const id='f-'+key.replace(/\W+/g,'-'),c=area?el('textarea',{id,rows:'4'}):el('input',{id,type:'text'});
  c.value=value||'';c.dataset.key=key;c.dataset.path=path;if(auto)c.setAttribute('autocomplete',auto);c.addEventListener('input',()=>onInput(c.value));if(key==='p-title')c.addEventListener('change',()=>{if(!contentCategory)build(ed.snapshot());});return el('div',{class:'lw-field'},el('label',{for:id},label),c);};
 const open=new Set(['personal','look','occupation']);
 const suggestionsFor=snap=>occupationContent({role:contentRole||snap.document.personalInfo.title,category:contentCategory});
 const sec=(id,title,...kids)=>{const d=el('details',{class:'lw-sec','data-sec':id},el('summary',{},title),el('div',{class:'lw-sec-body'},...kids));if(open.has(id))d.open=true;d.addEventListener('toggle',()=>{if(!d.isConnected)return;d.open?open.add(id):open.delete(id);});return d;};
 const plain=h=>(h||'').replace(/<li[^>]*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
 const toHtml=t=>{const ls=t.split(/\n/).map(x=>x.replace(/^[\s•*-]+/,'').trim()).filter(Boolean);return ls.length?'<ul>'+ls.map(l=>'<li>'+l.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</li>').join('')+'</ul>':'';};
 function build(snap){
  // The browser dispatches details "toggle" asynchronously. Read the live open
  // states before rebuilding and ignore late toggle events from detached trees.
  for(const d of form.querySelectorAll('details.lw-sec[data-sec]')){
   if(d.open)open.add(d.dataset.sec);else open.delete(d.dataset.sec);
  }
  // Preserve search/filter, scroll and keyboard target when a skill changes the
  // document shape and forces the editor panel to rebuild.
  const panelKey=node=>node.dataset.suggestionKind+'|'+(node.closest('[data-entry-id]')?.dataset.entryId||'');
  const panelStates=new Map();
  let focusedSuggestion=null;
  for(const panel of form.querySelectorAll('details.lw-suggestions')){
   const key=panelKey(panel),search=panel.querySelector('input[type=search]');
   panelStates.set(key,{query:search?.value||'',scroll:panel.querySelector('.lw-suggestion-list')?.scrollTop||0,open:panel.open});
   if(panel.contains(document.activeElement)){
    const active=document.activeElement;
    focusedSuggestion={key,search:active===search,
     body:active.closest?.('.lw-suggestion-choice')?.querySelector('.lw-suggestion-body')?.textContent||null};
   }
  }
  const act=document.activeElement?.dataset?.key;form.replaceChildren();
  form.append(sec('personal','Personal details',...PERSONAL.map(([k,l,a])=>field(l,snap.document.personalInfo[k],'p-'+k,'personalInfo.'+k,v=>ed.setPersonal(k,v),{auto:a}))));
  const chosen=suggestionsFor(snap);
  const picker=occupationPicker({title:snap.document.personalInfo.title,category:contentCategory,role:contentRole,
   onChange:({category,role,source})=>{
    contentCategory=category;contentRole=role;
    build(ed.snapshot()); // Capture the previous visible state first.
    for(const id of ['occupation','summary','skills']){
     open.add(id);
     const section=form.querySelector('details.lw-sec[data-sec="'+id+'"]');
     if(section)section.open=true; // Explicit user navigation wins over prior collapsed state.
    }
    const fieldName=source==='category'?'Occupation category':'Occupation or job title';
    form.querySelector('.lw-occupation-picker select[aria-label="'+fieldName+'"]')?.focus();
   }});
  form.append(sec('occupation','Smart content library',picker,
   el('p',{class:'lw-help'},'Choose an occupation to browse ready-made examples. This does not change your CV until you select a suggestion.'),
   contentRole?el('button',{type:'button',class:'lw-btn sm',on:{click:()=>{
    ed.endCoalescing();ed.setPersonal('title',contentRole);ed.endCoalescing();ctx.toast('Job title updated; Undo is available.');
   }}},'Use selected job title in my CV'):null));
  const appendBox=el('input',{type:'checkbox','aria-label':'Add selected summary to existing text instead of replacing',
   checked:appendSummarySelection||undefined,on:{change:e=>{appendSummarySelection=e.target.checked;}}});
  form.append(sec('summary','Summary',field('Summary',snap.document.summary,'summary','summary',v=>ed.setText('summary',v),{area:true}),
   chosen?el('label',{class:'lw-help'},appendBox,' Add the next example to my existing summary (otherwise replace it)'):null,
   chosen?suggestionList({kind:'summary',heading:'Choose a professional summary',items:chosen.summaries,expanded:true,
    getSelectionContext:()=>ed.snapshot().document,
    isSelected:(value,document)=>hasSuggestedSummary(document.summary,value),
    onChoose:value=>{
     const merged=mergeSummary(ed.snapshot().document.summary,value,{append:appendSummarySelection});
     if(merged===null){ctx.toast('Already included, or over the 800-character summary limit. Edit before adding more.');return;}
     const existing=ed.snapshot().document.summary;
     if(!appendSummarySelection&&existing&&existing!==merged&&
      !confirm('Replace your existing professional summary with this example? You can Undo afterwards.'))return;
     ed.endCoalescing();ed.setText('summary',merged);ed.endCoalescing();
     ctx.toast('Summary added. Check all claims; Undo is available.');
    },
    onRemove:value=>{
     const next=removeSuggestedSummary(ed.snapshot().document.summary,value);
     if(next===null){ctx.toast('This example was edited and cannot be removed automatically.');return;}
     ed.endCoalescing();ed.setText('summary',next);ed.endCoalescing();
     ctx.toast('Selected summary removed; Undo is available.');
    }}):el('p',{class:'lw-help'},'Select an occupation above to see professional summary examples.')));
  for(const [name,def] of Object.entries(SECS)){
   const items=snap.document[name],body=[];
   if(!items.length)body.push(el('p',{class:'lw-help',style:'margin-bottom:var(--s-3)'},'Nothing here yet.'));
   items.forEach((it,i)=>{
    const card=el('div',{class:'lw-item',role:'group','aria-label':def.label+' '+(i+1)+': '+def.name(it),'data-entry-section':name,'data-entry-id':it.id});
    card.append(el('div',{class:'lw-item-head'},el('strong',{'data-entry-name':it.id},def.name(it)),
     el('button',{type:'button',class:'lw-btn sm icon','aria-label':'Move '+def.name(it)+' up',disabled:i===0||undefined,on:{click:()=>ed.moveItem(name,it.id,-1)}},icon('up',{size:16})),
     el('button',{type:'button',class:'lw-btn sm icon','aria-label':'Move '+def.name(it)+' down',disabled:i===items.length-1||undefined,on:{click:()=>ed.moveItem(name,it.id,1)}},icon('down',{size:16})),
     el('button',{type:'button',class:'lw-btn sm icon danger','aria-label':'Remove '+def.name(it)+' (you can undo)',on:{click:()=>{ed.removeItem(name,it.id);ctx.toast(def.label+' entry removed. Press Undo to bring it back.');}}},icon('trash',{size:16}))));
    for(const [k,l,t] of def.fields){
     if(t==='area')card.append(field(l,plain(it[k]),it.id+k,name+'['+it.id+'].'+k,v=>ed.updateItem(name,it.id,{[k]:toHtml(v)}),{area:true}));
     else{
      const control=field(l,it[k],it.id+k,name+'['+it.id+'].'+k,v=>ed.updateItem(name,it.id,{[k]:v}));
      if(name==='experience'&&k==='title')control.querySelector('input')?.addEventListener('change',()=>{
       workCategories.delete(it.id);build(ed.snapshot()); // Update suggestions after typing, not per keystroke.
      });
      card.append(control);
     }
    }
    if(name==='experience'){
     const workCategory=workCategories.get(it.id)||resolveOccupation(it.title)?.group||'';
     const select=el('select',{'aria-label':'Responsibility category for '+(it.title||'this job'),'data-work-category':it.id,
      on:{change:e=>{
       if(e.target.value)workCategories.set(it.id,e.target.value);
       else workCategories.delete(it.id);
       build(ed.snapshot());
       [...form.querySelectorAll('[data-work-category]')].find(n=>n.dataset.workCategory===it.id)?.focus();
      }}},el('option',{value:''},'Choose an occupation'));
     for(const group of OCCUPATION_CATEGORIES)select.append(el('option',{value:group.id},group.label));
     select.value=workCategory;
     card.append(el('div',{class:'lw-field'},
      el('label',{},'Responsibility examples for this job'),select));
     const workContent=occupationContent({role:it.title,category:workCategory});
     if(workContent)card.append(suggestionList({kind:'duties',heading:'Suggested duties for '+workContent.groupLabel,
      items:workContent.duties,expanded:true,
      getSelectionContext:()=>ed.snapshot().document,
      isSelected:(bullet,document)=>{
       const row=document.experience.find(x=>x.id===it.id);
       return !!row&&hasSuggestedDuty(plain(row.description||''),bullet);
      },
      onChoose:bullet=>{
       const row=ed.snapshot().document.experience.find(x=>x.id===it.id);
       if(!row)return;
       const next=appendUniqueDuty(plain(row.description||''),bullet);
       if(next===null){ctx.toast('This responsibility is already included.');return;}
       ed.endCoalescing();ed.updateItem('experience',it.id,{description:toHtml(next)});ed.endCoalescing();
       ctx.toast('Responsibility added. Verify it matches your experience; Undo is available.');
      },
      onRemove:bullet=>{
       const row=ed.snapshot().document.experience.find(x=>x.id===it.id);
       if(!row)return;
       const next=removeSuggestedDuty(plain(row.description||''),bullet);
       if(next===null){ctx.toast('This responsibility was edited and cannot be removed automatically.');return;}
       ed.endCoalescing();ed.updateItem('experience',it.id,{description:toHtml(next)});ed.endCoalescing();
       ctx.toast('Responsibility removed; Undo is available.');
      }}));
     else card.append(el('p',{class:'lw-help'},'Choose the actual job category above to see responsibilities for this experience. Your target CV occupation does not automatically change past work duties.'));
    }
    body.push(card);
   });
   body.push(el('button',{type:'button',class:'lw-btn',on:{click:()=>{open.add(name);ed.addItem(name,{});}}},icon('plus'),def.add));
   form.append(sec(name,def.label+(items.length?' ('+items.length+')':''),...body));
  }
  const chips=el('ul',{class:'lw-row',style:'list-style:none;padding:0;margin:0 0 var(--s-3)'},snap.document.skills.map(s=>el('li',{},el('span',{class:'lw-chip'},s.name,el('button',{type:'button','aria-label':'Remove skill '+s.name,class:'lw-btn ghost sm icon',style:'min-height:28px;min-width:28px;width:28px;padding:0',on:{click:()=>ed.removeItem('skills',s.id)}},icon('x',{size:14}))))));
  const sk=el('input',{type:'text',id:'f-newskill','data-key':'newskill','aria-describedby':'skill-help',on:{keydown:e=>{if(e.key==='Enter'){e.preventDefault();addSkill();}}}});
  const addSkill=()=>{const v=sk.value.trim();if(v){open.add('skills');ed.addItem('skills',{name:v,level:3});}};
  form.append(sec('skills','Skills'+(snap.document.skills.length?' ('+snap.document.skills.length+')':''),chips,el('div',{class:'lw-field'},el('label',{for:'f-newskill'},'Add a skill'),el('div',{class:'lw-row'},sk,el('button',{type:'button',class:'lw-btn',on:{click:addSkill}},'Add')),el('p',{id:'skill-help',class:'lw-help'},'Press Enter to add. Only list skills you really have.')),
   chosen?suggestionList({kind:'skills',heading:'Suggested '+chosen.groupLabel+' skills',
    items:chosen.skills,expanded:true,
    getSelectionContext:()=>ed.snapshot().document,
    isSelected:(name,document)=>!addUniqueSkill(document.skills,name),
    onChoose:name=>{
     const skill=addUniqueSkill(ed.snapshot().document.skills,name);
     if(!skill){ctx.toast('Skill already added.');return;}
     ed.addItem('skills',{name:skill,level:3});ctx.toast('Skill added; Undo is available.');
    },
    onRemove:name=>{
     const row=ed.snapshot().document.skills.find(s=>!addUniqueSkill([s],name));
     if(!row){ctx.toast('Skill is no longer in this CV.');return;}
     ed.removeItem('skills',row.id);ctx.toast('Skill removed; Undo is available.');
    }}):el('p',{class:'lw-help'},'Choose an occupation above to see suggested skills.')));
  const tpl=getTemplate(snap.appearance.template);
  const sw=el('div',{class:'lw-row',role:'group','aria-label':'Accent colour'},ACCENTS.map(c=>el('button',{type:'button',class:'lw-btn icon','aria-label':'Accent '+c,'aria-pressed':String(snap.appearance.color.toLowerCase()===c),style:`background:${c};border:3px solid ${snap.appearance.color.toLowerCase()===c?'var(--ink)':'transparent'};border-radius:50%;width:44px`,on:{click:()=>ed.setAppearance({color:c})}})));
  const ap=sec('look','Look and layout',el('p',{style:'margin-bottom:var(--s-3)'},'Template: ',el('strong',{},tpl.name),' ',el('a',{class:'lw-btn sm',href:'#/templates'},'Change')),
   el('div',{class:'lw-field'},el('span',{class:'lw-help'},'Accent colour'),sw),
   ...[['Text size','fontSize',OPTIONS.fontSize],['Spacing','spacing',OPTIONS.spacing],['Margins','margins',OPTIONS.margins]].map(([l,k,o])=>el('div',{class:'lw-field'},el('span',{class:'lw-help'},l),seg(l,k,o,x=>x[0].toUpperCase()+x.slice(1)))));
  ap.querySelector('.lw-sec-body').append(designControls(ed,ctx),saveDesignControls(ed,ctx,ctx.designStorage??globalThis.localStorage));
  form.append(ap);
  form.append(sec('section-layout','Sections and order',sectionsControls(ed,ctx)));
  const custom=snap.document.customSections||[];
  const customKids=custom.map((it,i)=>el('div',{class:'lw-item',role:'group','aria-label':'Custom section '+(i+1)},
    field('Section title',it.title||'',it.id+'title','customSections['+it.id+'].title',v=>ed.updateItem('customSections',it.id,{title:v})),
    field('Section content',plain(it.content||''),it.id+'content','customSections['+it.id+'].content',v=>ed.updateItem('customSections',it.id,{content:toHtml(v)}),{area:true}),
    el('div',{class:'lw-row'},
     el('button',{type:'button',class:'lw-btn sm','aria-label':'Move custom section up',disabled:i===0||undefined,on:{click:()=>ed.moveItem('customSections',it.id,-1)}},'Move up'),
     el('button',{type:'button',class:'lw-btn sm','aria-label':'Move custom section down',disabled:i===custom.length-1||undefined,on:{click:()=>ed.moveItem('customSections',it.id,1)}},'Move down'),
     el('button',{type:'button',class:'lw-btn sm danger',on:{click:()=>ed.removeItem('customSections',it.id)}},'Remove'))));
  if(custom.length)form.append(sec('custom','Custom sections ('+custom.length+')',...customKids));
  for(const panel of form.querySelectorAll('details.lw-suggestions')){
   const saved=panelStates.get(panelKey(panel));
   if(!saved)continue;
   panel.open=saved.open;
   const search=panel.querySelector('input[type=search]');
   if(search&&saved.query){search.value=saved.query;search.dispatchEvent(new Event('input',{bubbles:true}));}
   const list=panel.querySelector('.lw-suggestion-list');
   if(list)list.scrollTop=saved.scroll;
  }
  if(focusedSuggestion){
   const panel=[...form.querySelectorAll('details.lw-suggestions')].find(n=>panelKey(n)===focusedSuggestion.key);
   const next=focusedSuggestion.search?panel?.querySelector('input[type=search]'):
    [...(panel?.querySelectorAll('.lw-suggestion-choice')||[])].find(btn=>
     btn.querySelector('.lw-suggestion-body')?.textContent===focusedSuggestion.body);
   next?.focus();
  }else if(act){const n=form.querySelector('[data-key="'+act+'"]');if(n)n.focus();}
 }
 const shape=s=>JSON.stringify([s.document.experience.map(i=>i.id),s.document.education.map(i=>i.id),
  s.document.skills.map(x=>x.id+':'+x.name),s.document.customSections.map(x=>x.id),s.appearance.template,
  s.appearance.sectionOrder,s.appearance.enabledSections]);
 let last='',layout=null;
 const quick=quickEditOnPage(prevWrap,ed,ctx);
 function redraw(){
  const snap=ed.snapshot();layout=layoutFor(snap.document,snap.appearance);
  const w=prevWrap.clientWidth-32,fit=Math.max(0.3,Math.min(1.4,w/layout.paper.width)),scale=zoomMode.fit?fit:1;
  drawPages(pages,layout,scale||0.6,{onEdit:(path,anchor)=>quick.open(path,anchor)});
  const count=layout.pageCount;
  metrics.textContent=count+(count===1?' page':' pages')+' · '+layout.style.paper+
   ' · '+getTemplate(layout.style.template).name+
   (layout.warnings.length?' · '+layout.warnings[0]:'');
 }
 const redrawSoon=debounceFrame(redraw);
 function sync(snap){
  undo.disabled=!snap.canUndo;redo.disabled=!snap.canRedo;
  for(const b of paperSeg.children)b.setAttribute('aria-pressed',String(b.dataset.v===snap.appearance.paper));
  for(const g of form.querySelectorAll('.lw-seg[aria-label="Text size"] button,.lw-seg[aria-label="Spacing"] button,.lw-seg[aria-label="Margins"] button')){const k={'Text size':'fontSize',Spacing:'spacing',Margins:'margins'}[g.parentElement.getAttribute('aria-label')];g.setAttribute('aria-pressed',String(g.dataset.v===snap.appearance[k]));}
  const st=store.status;status.className='lw-chip '+(ctx.privateSession?'warn':st.state==='error'?'err':st.state==='saved'?'ok':'');
  status.textContent=ctx.privateSession?'Not saved — private session. Download before closing.':st.state==='error'?'✖ Not saved: '+(st.detail||(
    st.error==='QUOTA'?'browser storage is full':st.error==='CONFLICT'?'another tab changed this CV':st.error==='UNCONFIRMED'?'confirm master editing first':'storage unavailable'))+'. Download an unsaved draft.':st.state==='saving'?'Saving…':'✓ Saved on this device';
  if(shape(snap)!==last){last=shape(snap);build(snap);}
  const effective=resolveStyle(snap.appearance);
  for(const input of form.querySelectorAll('[data-appearance]')){
   if(document.activeElement===input)continue;
   const key=input.dataset.appearance;
   const val=snap.appearance[key]??({bodySize:effective.size,leading:effective.lineHeight,sectionGap:effective.sectionGap,marginSize:effective.margin,headerScale:effective.headerScale,headingScale:effective.headingScale,
    entryGap:effective.entryGap,paragraphGap:effective.paragraphGap,ruleWeight:effective.ruleWeight}[key]);
   if(val!==undefined&&val!==null)input.value=String(val);
   const output=form.querySelector('[data-output="'+key+'"]');
   if(output&&typeof val==='number')output.textContent=val.toFixed(['leading','headerScale','headingScale'].includes(key)?2:1)+(['leading','headerScale','headingScale'].includes(key)?'×':' pt');
  }
  for(const input of form.querySelectorAll('input[data-path],textarea[data-path]')){
   if(document.activeElement===input)continue;
   const info=fieldAtPath(ed,input.dataset.path,snap.document);
   if(info&&input.value!==info.value)input.value=info.value;
  }
  // Update role labels without tearing down focused form inputs on each keystroke.
  for(const card of form.querySelectorAll('[data-entry-section]')){
   const section=card.dataset.entrySection,id=card.dataset.entryId;
   const item=snap.document[section]?.find(x=>x.id===id);
   const text=item&&SECS[section]?.name(item);
   if(text){
    const strong=card.querySelector('[data-entry-name]');
    if(strong&&strong.textContent!==text)strong.textContent=text;
   }
  }
  quick.sync(snap.document);
  // Reflect Add/Remove cards after summary edits, duties, Undo and Redo, not just list rebuilds.
  for(const panel of form.querySelectorAll('details.lw-suggestions'))panel.refreshSelections?.();
  for(const row of form.querySelectorAll('.lw-section-row[data-section-key^="custom:"]')){
   const id=row.dataset.sectionKey.slice('custom:'.length);
   const item=snap.document.customSections.find(x=>x.id===id);
   if(!item)continue;
   const name=item.title||item.name||'New section';
   const span=row.querySelector('label span'),check=row.querySelector('input[type=checkbox]'),buttons=row.querySelectorAll('button');
   if(span&&span.textContent!==name)span.textContent=name;
   check?.setAttribute('aria-label','Show '+name);
   buttons[0]?.setAttribute('aria-label','Move '+name+' up');
   buttons[1]?.setAttribute('aria-label','Move '+name+' down');
  }
  redrawSoon();
 }
 let off=ed.subscribe(sync);const offStore=store.subscribe(()=>sync(ed.snapshot()));
 const ro=typeof ResizeObserver==='function'?new ResizeObserver(()=>redrawSoon()):null;ro?.observe(prevWrap);
 const onKey=e=>{if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key==='z'&&!/INPUT|TEXTAREA/.test(document.activeElement?.tagName)){e.preventDefault();ed.undo();}
  if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.shiftKey&&e.key==='Z'))&&!/INPUT|TEXTAREA/.test(document.activeElement?.tagName)){e.preventDefault();ed.redo();}};
 document.addEventListener('keydown',onKey);
 sync(ed.snapshot());
 return {node:root,destroy:()=>{quick.destroy();off();offStore();ro?.disconnect();document.removeEventListener('keydown',onKey);},focusPath(path){
  const t=form.querySelector('[data-path="'+path+'"]')||form.querySelector('[data-path^="'+path.replace(/\.[^.]+$/,'')+'"]');
  if(t){t.closest('details')&&(t.closest('details').open=true);wrap.dataset.tab='edit';t.focus();t.scrollIntoView({block:'center'});return true;}return false;}};
}
/* ====================== Templates ====================== */
export function templatesView(ctx){
 const {store}=ctx,root=el('div'),grid=el('div',{class:'lw-gallery','aria-label':'CV template choices'});
 let family='All',query='';
 const resultCount=el('p',{class:'lw-gallery-count',role:'status','aria-live':'polite'},TEMPLATES.length+' templates');
 const search=el('input',{type:'search',class:'lw-template-search',placeholder:'Find a template by name or style…','aria-label':'Search CV templates',
  on:{input:e=>{query=e.target.value.trim().toLocaleLowerCase('en');draw();}}});
 const filter=el('div',{class:'lw-seg lw-gallery-filters',role:'group','aria-label':'Filter by style'},
  ['All',...FAMILIES].map(f=>el('button',{type:'button','data-family':f,'aria-pressed':String(f==='All'),on:{click:()=>{
   family=f;for(const b of filter.children)b.setAttribute('aria-pressed',String(b.dataset.family===f));draw();
  }}},f==='All'?f:f[0].toUpperCase()+f.slice(1))));
 root.append(el('header',{class:'lw-page-head'},el('div',{},
  el('h1',{id:'page-title',tabindex:'-1'},'Choose a template'),
  el('p',{},'38 editable templates, including eight new screenshot-inspired styles. Previews show your own CV. Switching a design never rewrites your words.'))));
 root.append(el('div',{class:'lw-template-tools'},search,filter,resultCount),savedDesignGallery(ctx,ctx.designStorage??globalThis.localStorage),grid);
 function draw(){
  const s=store.editor.snapshot(),doc=store.hasContent()?s.document:SAMPLE_DOC();
  const found=TEMPLATES.filter(t=>(family==='All'||t.family===family)&&
   (!query||(t.name+' '+t.family+' '+(t.tokens.design||'')).toLocaleLowerCase('en').includes(query)));
  resultCount.textContent=found.length+' of '+TEMPLATES.length+' templates';
  grid.replaceChildren();
  if(!found.length){
   grid.append(el('p',{class:'lw-card lw-gallery-empty'},'No templates match. Try another style or clear your search.'));
   return;
  }
  const fragment=document.createDocumentFragment();
  for(const t of found){
   const lay=layoutFor(doc,{...s.appearance,template:t.id,color:t.color||s.appearance.color});
   const sidebar=t.tokens.layout==='sidebar';
   const desc=t.family[0].toUpperCase()+t.family.slice(1)+(sidebar?' · print-safe single-column export':'');
   const tag=t.tokens.design?el('span',{class:'lw-template-new'},'New design'):null;
   fragment.append(el('button',{type:'button',class:'lw-tpl','data-template-id':t.id,'aria-label':'Select '+t.name+' template',
    'aria-pressed':String(s.appearance.template===t.id),on:{click:()=>{
     if(!confirmDesignEditing(ctx))return;
     store.editor.setAppearance(applyTemplate(store.editor.snapshot().appearance,t.id,{keepColor:false}));
     ctx.toast(t.name+' selected. Your CV information is unchanged.');draw();
    }}},
    thumbnail(lay),el('span',{class:'lw-template-name'},el('strong',{},t.name),tag),
    el('small',{},desc)));
  }
  grid.append(fragment);
 }
 draw();return {node:root};
}
/* ====================== Check ====================== */
const SEV={error:['✖','Error','err'],warning:['▲','Warning','warn'],info:['ℹ','Tip','info']};
export function checkView(ctx){
 const {store}=ctx,root=el('div'),s=store.editor.snapshot();
 root.append(el('header',{class:'lw-page-head'},el('div',{},el('h1',{id:'page-title',tabindex:'-1'},'Check your CV'),el('p',{},'Local checks on your CV text and generated layout preview. Review the exported PDF/DOCX separately; no ATS or hiring prediction is produced.'))));
 if(!store.hasContent()){root.append(el('div',{class:'lw-empty'},el('h3',{},'Nothing to check yet'),el('p',{},'Create or import a CV first.'),el('a',{class:'lw-btn primary',href:'#/home'},'Get started')));return {node:root};}
 const lay=layoutFor(s.document,s.appearance);
 const art={text:lay.text,pageCount:lay.pageCount,warnings:lay.warnings};
 const expanded=analyzeResumeReadiness({document:s.document,appearance:s.appearance,artifact:art});
 const r=expanded.baseline;
 root.append(el('div',{class:'lw-stats',style:'margin-bottom:var(--s-5)'},[['Errors',r.counts.error,'err'],['Warnings',r.counts.warning,'warn'],['Tips',r.counts.info,'info'],['Pages',lay.pageCount,'']].map(([l,n,c])=>el('div',{class:'lw-card lw-stat'},el('span',{class:'lw-help'},l),el('strong',{},String(n))))));
 if(!expanded.prioritizedCorrections.length)root.append(el('div',{class:'lw-card'},el('h2',{},'No local concerns detected'),el('p',{class:'lw-help'},'This does not establish ATS compatibility or writing accuracy. Review your exported file and re-check after edits.')));
 const ul=el('ul',{class:'lw-findings','aria-label':'Findings'});
 for(const f of r.findings){const [ic,label,cls]=SEV[f.severity];
  ul.append(el('li',{class:'lw-finding '+f.severity},el('span',{class:'ic','aria-hidden':'true'},ic),
   el('div',{},el('p',{},el('span',{class:'lw-visually-hidden'},label+': '),f.message),el('p',{class:'why'},f.explanation)),
   f.path?el('button',{type:'button',class:'lw-btn sm',on:{click:()=>ctx.goField(f.path)}},'Go to field'):null));}
 const technicalFindings=el('details',{class:'lw-card'},el('summary',{},'Technical findings ('+r.findings.length+')'),ul);
 root.append(el('section',{class:'lw-card','aria-labelledby':'h-priority'},
  el('h2',{id:'h-priority'},'Priority corrections and recruiter review'),
  el('p',{class:'lw-help'},'High-priority corrections first. This is not a score or a hiring prediction. The checks are local heuristics requiring review.')));
 const top=expanded.prioritizedCorrections.slice(0,12);
 if(top.length)root.append(el('ol',{class:'lw-findings','aria-label':'Prioritized corrections'},top.map(f=>
  el('li',{class:'lw-finding '+(f.priority==='critical'?'error':f.priority==='high'?'warning':'info')},
   el('div',{},el('strong',{},f.priority.toUpperCase()+': '+f.message),
    el('p',{class:'why'},f.explanation),
    el('p',{class:'lw-help'},'Next step: '+f.correction)),
   f.path&&/^(personalInfo|experience|education|skills|summary)/.test(f.path)?
    el('button',{type:'button',class:'lw-btn sm',on:{click:()=>ctx.goField(f.path)}},'Go to field'):null
  ))));
 else root.append(el('p',{class:'lw-help'},'No additional issues detected by the local heuristics.'));
 root.append(technicalFindings);
 if(expanded.opportunities.length)root.append(el('section',{class:'lw-card'},
   el('h2',{},'Potential career-story opportunities'),
   el('ul',{class:'lw-findings'},expanded.opportunities.map(f=>
    el('li',{class:'lw-finding info'},el('strong',{},f.message),
     el('p',{class:'lw-help'},f.explanation+' '+f.correction))))));
 root.append(el('details',{class:'lw-card'},
  el('summary',{},'27 published categories/checks — what we can and cannot assess'),
  el('p',{class:'lw-help'},'Scope reference from Enhancv’s published checklist. A local check is NOT an external ATS result, and no job-match score is generated.'),
  expanded.byCategory.map(g=>el('section',{},
   el('h3',{style:'margin:var(--s-4) 0 var(--s-2)'},g.name),
   el('ul',{class:'lw-findings','aria-label':g.name+' checks'},g.checks.map(c=>
    el('li',{class:'lw-finding '+(c.observed==='review-suggested'?'warning':'info')},
     el('div',{},
      el('strong',{},c.label+' — '+(c.observed==='review-suggested'?'Review suggested':
       c.observed==='no-local-flag'?'No local flag':c.observed==='opportunity'?'Possible opportunity':
       c.status==='needs-input'?'Input needed':'Not verified')),
      el('p',{class:'lw-help'},c.reason),
      c.preview?el('p',{class:'lw-help'},'Example finding: '+c.preview):null))))))));
 const tips=analyzeWriting(s.document).slice(0,8);
 if(tips.length){root.append(el('h2',{style:'margin:var(--s-6) 0 var(--s-3)'},'Writing tips'));
  root.append(el('ul',{class:'lw-findings'},tips.map(t=>el('li',{class:'lw-finding info'},el('span',{class:'ic','aria-hidden':'true'},'✎'),el('div',{},el('p',{},t.message),el('p',{class:'why'},'“'+t.before+'”'+(t.after?' → suggested: “'+t.after+'” (check it still reads correctly)':'')))))));}
 return {node:root};
}
/* ====================== Jobs ====================== */
export function jobsView(ctx){
 const {store}=ctx,root=el('div'),board=el('div',{class:'lw-board',role:'list','aria-label':'Application board'});
 const rev=()=>store.applications.revision;
 const guard=fn=>{try{fn();}catch(e){ctx.toast(e.message||'Something went wrong');}};
 const dlg=el('dialog',{'aria-labelledby':'dlg-h'});
 const f={company:el('input',{type:'text',id:'a-company',maxlength:'200'}),role:el('input',{type:'text',id:'a-role',maxlength:'200'}),url:el('input',{type:'url',id:'a-url',placeholder:'https://'}),notes:el('textarea',{id:'a-notes',rows:'3'})};
 const err=el('p',{class:'lw-error',role:'alert',style:'color:var(--danger);font-weight:600'});
 const lf=(l,c,id)=>el('div',{class:'lw-field'},el('label',{for:id},l),c);
 const form=el('form',{method:'dialog',on:{submit:e=>{e.preventDefault();
  try{store.setApplications(T.addApplication(store.applications,{company:f.company.value,role:f.role.value,url:f.url.value,notes:f.notes.value,expectedRevision:rev()}));dlg.close();for(const c of Object.values(f))c.value='';err.textContent='';ctx.toast('Application added.');draw();}
  catch(x){err.textContent=x.message;(f.company.value||f.role.value?f.url:f.company).focus();}}}},
  el('h2',{id:'dlg-h',style:'margin-bottom:var(--s-4)'},'Add an application'),lf('Company',f.company,'a-company'),lf('Job title',f.role,'a-role'),lf('Link to the advert (optional)',f.url,'a-url'),lf('Notes (optional)',f.notes,'a-notes'),err,
  el('div',{class:'lw-row'},el('button',{type:'submit',class:'lw-btn primary'},'Add'),el('button',{type:'button',class:'lw-btn',on:{click:()=>{dlg.close();err.textContent='';}}},'Cancel')));
 dlg.append(el('div',{class:'lw-dialog-body'},form));
 const addBtn=el('button',{type:'button',class:'lw-btn primary',on:{click:()=>{dlg.showModal();f.company.focus();}}},icon('plus'),'Add application');
 root.append(el('header',{class:'lw-page-head'},el('div',{},el('h1',{id:'page-title',tabindex:'-1'},'Applications'),el('p',{},'Track where you have applied. Use the menu on each card to move it along. Reminders only appear while this app is open.')),
  el('div',{class:'lw-row'},addBtn,el('button',{type:'button',class:'lw-btn',on:{click:()=>{download(exportCsv(store.applications),'applications.csv','text/csv');ctx.toast('Downloaded applications.csv');}}},icon('download'),'CSV'))),board,dlg);
 function draw(){
  board.replaceChildren();const k=T.kanban(store.applications);
  for(const [st,list] of Object.entries(k)){
   const col=el('section',{class:'lw-col',role:'listitem','aria-labelledby':'c-'+st},el('h2',{id:'c-'+st},st,el('span',{class:'lw-badge'},String(list.length))));
   const ul=el('ul',{});
   if(!list.length)ul.append(el('li',{class:'lw-help'},'Nothing here'));
   for(const a of list){
    const sel=el('select',{'aria-label':'Move '+(a.company||a.role)+' to another stage',on:{change:e=>{guard(()=>{store.setApplications(T.setStatus(store.applications,a.id,e.target.value,{expectedRevision:rev()}));ctx.toast((a.company||a.role)+' moved to '+e.target.value+'.');draw();});}}},
     ...Object.keys(k).map(s=>el('option',{value:s,selected:s===a.status||undefined},s===a.status?'Stage: '+s:'Move to '+s)));
    ul.append(el('li',{},el('div',{class:'lw-appcard'},el('strong',{},a.company||'(no company)'),el('span',{class:'lw-help'},a.role||''),a.url?el('p',{},el('a',{href:a.url,target:'_blank',rel:'noopener noreferrer'},'View advert')):null,
     sel,el('button',{type:'button',class:'lw-btn sm ghost danger',style:'margin-top:var(--s-2)','aria-label':'Delete '+(a.company||a.role),on:{click:()=>{if(confirm('Delete this application?')){guard(()=>{store.setApplications(T.removeApplication(store.applications,a.id,{expectedRevision:rev(),confirmed:true}));ctx.toast('Application deleted.');draw();});}}}},icon('trash',{size:16}),'Delete'))));
   }
   col.append(ul);board.append(col);
  }
 }
 if(!store.applications.applications.length)root.insertBefore(el('div',{class:'lw-callout'},el('p',{},el('strong',{},'No applications yet. '),'Add the jobs you are interested in, then move each card along as things progress.'),el('button',{type:'button',class:'lw-btn primary',on:{click:()=>{dlg.showModal();f.company.focus();}}},icon('plus'),'Add your first')),board);
 draw();return {node:root};
}

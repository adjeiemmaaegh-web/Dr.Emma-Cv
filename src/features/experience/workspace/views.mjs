/** Workspace views. Each returns {node, destroy?}. They only use other workstreams' public APIs. */
import {el,icon,download,debounceFrame} from './ui.mjs';
import {layoutFor,drawPages,thumbnail} from './preview.mjs';
import {listTemplates,FAMILIES,applyTemplate,getTemplate,OPTIONS,TEMPLATES} from '../../templates/registry.mjs';
import {renderDocumentArtifact} from '../../export/export-service.mjs';
import {runAtsChecks,analyzeWriting} from '../../intelligence/index.mjs';
import * as T from '../../tracker/tracker.mjs';
import {exportCsv,exportBook} from '../../tracker/io.mjs';
import {onboardingFeature} from '../../onboarding/onboarding-module.mjs';
import {assessStorageHealth,collectStorageSignals} from '../../pwa-ui/status.mjs';
import {SAMPLE_DOC} from './store.mjs';
import {createWorkspaceDataPanel} from './data-panel.mjs';
import {createWorkspaceCvImportPanel} from './cv-import-panel.mjs';
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
 root.append(el('header',{class:'lw-page-head'},el('div',{},el('h1',{id:'page-title',tabindex:'-1'},has?'Welcome back':'Let’s build your CV'),
  el('p',{},has?'Pick up where you left off, check your CV, or track a new application.':'Answer a few simple questions, or import the CV you already have. Everything stays on this device.')),
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
 collectStorageSignals({navigator:globalThis.navigator,location:globalThis.location,localStorage:globalThis.localStorage}).then(sg=>{
  sg.lastWriteError=store.status.error;const h=assessStorageHealth(sg);
  sig.replaceChildren(el('h2',{id:'h-store'},'Your saved work'),el('p',{style:'margin:var(--s-2) 0'},el('span',{class:'lw-chip '+(h.level==='ok'?'ok':h.level==='warning'?'warn':'err')},(h.level==='ok'?'✓ ':h.level==='warning'?'▲ ':'✖ ')+h.summary)),
   el('ul',{class:'lw-help',style:'padding-left:1.1rem;margin:0'},h.items.slice(0,3).map(i=>el('li',{},i.message))));
 }).catch(()=>{});
 grid.append(el('section',{class:'lw-card','aria-labelledby':'h-tip'},el('h2',{id:'h-tip'},'Tip'),el('p',{class:'lw-help'},'Use ',el('kbd',{},'Ctrl'),' + ',el('kbd',{},'K'),' to jump anywhere or run a command without leaving the keyboard.')));
 root.append(grid);
 if(store.mode==='persistent'){
  const panel=createWorkspaceDataPanel(ctx);root.append(panel.node);cleanups.push(()=>panel.destroy?.());
  const cvImport=createWorkspaceCvImportPanel(ctx);root.append(cvImport.node);cleanups.push(()=>cvImport.destroy?.());
 }
 const hostBox=el('div');root.append(el('section',{'aria-label':'Guided start'},hostBox));
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
    ctx.toast('Saved to this device.');ctx.go('#/editor');
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
 const root=el('div'),status=el('span',{class:'lw-chip',role:'status'});
 const undo=el('button',{type:'button',class:'lw-btn icon','aria-label':'Undo',on:{click:()=>ed.undo()}},icon('undo')),redo=el('button',{type:'button',class:'lw-btn icon','aria-label':'Redo',on:{click:()=>ed.redo()}},icon('redo'));
 const seg=(label,key,opts,fmt=x=>x)=>{const g=el('div',{class:'lw-seg',role:'group','aria-label':label});
  for(const o of opts)g.append(el('button',{type:'button','data-v':o,'aria-pressed':'false',on:{click:()=>ed.setAppearance({[key]:o})}},fmt(o)));return g;};
 const paperSeg=seg('Paper size','paper',OPTIONS.paper),zoomMode={fit:true};
 const zoomSeg=el('div',{class:'lw-seg',role:'group','aria-label':'Preview zoom'},['Fit','100%'].map(z=>el('button',{type:'button','aria-pressed':String(z==='Fit'),on:{click:()=>{zoomMode.fit=z==='Fit';for(const b of zoomSeg.children)b.setAttribute('aria-pressed',String(b.textContent===z));redraw();}}},z)));
 const tabs=el('div',{class:'lw-seg lw-tabs',role:'group','aria-label':'Show'},['Edit','Preview'].map(t=>el('button',{type:'button','aria-pressed':String(t==='Edit'),on:{click:()=>{wrap.dataset.tab=t.toLowerCase();for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.textContent===t));redraw();}}},t)));
 root.append(el('header',{class:'lw-page-head'},el('div',{},el('h1',{id:'page-title',tabindex:'-1'},'Edit your CV'),el('p',{},'Changes save automatically on this device. The preview is exactly what the PDF will look like.')),
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
 const form=el('div',{class:'lw-editor-form'}),pages=el('div',{class:'lw-pages'}),prevWrap=el('div',{class:'lw-preview-wrap',tabindex:'0',role:'region','aria-label':'CV preview'},pages);
 const wrap=el('div',{class:'lw-editor','data-tab':'edit'},el('div',{class:'lw-form-col'},form),el('div',{class:'lw-preview-col'},prevWrap));root.append(wrap);
 const field=(label,value,key,path,onInput,{area,auto}={})=>{const id='f-'+key.replace(/\W+/g,'-'),c=area?el('textarea',{id,rows:'4'}):el('input',{id,type:'text'});
  c.value=value||'';c.dataset.key=key;c.dataset.path=path;if(auto)c.setAttribute('autocomplete',auto);c.addEventListener('input',()=>onInput(c.value));return el('div',{class:'lw-field'},el('label',{for:id},label),c);};
 const open=new Set(['personal']);
 const sec=(id,title,...kids)=>{const d=el('details',{class:'lw-sec','data-sec':id},el('summary',{},title),el('div',{class:'lw-sec-body'},...kids));if(open.has(id))d.open=true;d.addEventListener('toggle',()=>{d.open?open.add(id):open.delete(id);});return d;};
 const plain=h=>(h||'').replace(/<li[^>]*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
 const toHtml=t=>{const ls=t.split(/\n/).map(x=>x.replace(/^[\s•*-]+/,'').trim()).filter(Boolean);return ls.length?'<ul>'+ls.map(l=>'<li>'+l.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</li>').join('')+'</ul>':'';};
 function build(snap){
  const act=document.activeElement?.dataset?.key;form.replaceChildren();
  form.append(sec('personal','Personal details',...PERSONAL.map(([k,l,a])=>field(l,snap.document.personalInfo[k],'p-'+k,'personalInfo.'+k,v=>ed.setPersonal(k,v),{auto:a}))));
  form.append(sec('summary','Summary',field('Summary',snap.document.summary,'summary','summary',v=>ed.setText('summary',v),{area:true})));
  for(const [name,def] of Object.entries(SECS)){
   const items=snap.document[name],body=[];
   if(!items.length)body.push(el('p',{class:'lw-help',style:'margin-bottom:var(--s-3)'},'Nothing here yet.'));
   items.forEach((it,i)=>{
    const card=el('div',{class:'lw-item',role:'group','aria-label':def.label+' '+(i+1)+': '+def.name(it)});
    card.append(el('div',{class:'lw-item-head'},el('strong',{},def.name(it)),
     el('button',{type:'button',class:'lw-btn sm icon','aria-label':'Move '+def.name(it)+' up',disabled:i===0||undefined,on:{click:()=>ed.moveItem(name,it.id,-1)}},icon('up',{size:16})),
     el('button',{type:'button',class:'lw-btn sm icon','aria-label':'Move '+def.name(it)+' down',disabled:i===items.length-1||undefined,on:{click:()=>ed.moveItem(name,it.id,1)}},icon('down',{size:16})),
     el('button',{type:'button',class:'lw-btn sm icon danger','aria-label':'Remove '+def.name(it)+' (you can undo)',on:{click:()=>{ed.removeItem(name,it.id);ctx.toast(def.label+' entry removed. Press Undo to bring it back.');}}},icon('trash',{size:16}))));
    for(const [k,l,t] of def.fields){
     if(t==='area')card.append(field(l,plain(it[k]),it.id+k,name+'['+it.id+'].'+k,v=>ed.updateItem(name,it.id,{[k]:toHtml(v)}),{area:true}));
     else card.append(field(l,it[k],it.id+k,name+'['+it.id+'].'+k,v=>ed.updateItem(name,it.id,{[k]:v})));
    }
    body.push(card);
   });
   body.push(el('button',{type:'button',class:'lw-btn',on:{click:()=>{open.add(name);ed.addItem(name,{});}}},icon('plus'),def.add));
   form.append(sec(name,def.label+(items.length?' ('+items.length+')':''),...body));
  }
  const chips=el('ul',{class:'lw-row',style:'list-style:none;padding:0;margin:0 0 var(--s-3)'},snap.document.skills.map(s=>el('li',{},el('span',{class:'lw-chip'},s.name,el('button',{type:'button','aria-label':'Remove skill '+s.name,class:'lw-btn ghost sm icon',style:'min-height:28px;min-width:28px;width:28px;padding:0',on:{click:()=>ed.removeItem('skills',s.id)}},icon('x',{size:14}))))));
  const sk=el('input',{type:'text',id:'f-newskill','data-key':'newskill','aria-describedby':'skill-help',on:{keydown:e=>{if(e.key==='Enter'){e.preventDefault();addSkill();}}}});
  const addSkill=()=>{const v=sk.value.trim();if(v){open.add('skills');ed.addItem('skills',{name:v,level:3});}};
  form.append(sec('skills','Skills'+(snap.document.skills.length?' ('+snap.document.skills.length+')':''),chips,el('div',{class:'lw-field'},el('label',{for:'f-newskill'},'Add a skill'),el('div',{class:'lw-row'},sk,el('button',{type:'button',class:'lw-btn',on:{click:addSkill}},'Add')),el('p',{id:'skill-help',class:'lw-help'},'Press Enter to add. Only list skills you really have.'))));
  const tpl=getTemplate(snap.appearance.template);
  const sw=el('div',{class:'lw-row',role:'group','aria-label':'Accent colour'},ACCENTS.map(c=>el('button',{type:'button',class:'lw-btn icon','aria-label':'Accent '+c,'aria-pressed':String(snap.appearance.color.toLowerCase()===c),style:`background:${c};border:3px solid ${snap.appearance.color.toLowerCase()===c?'var(--ink)':'transparent'};border-radius:50%;width:44px`,on:{click:()=>ed.setAppearance({color:c})}})));
  const ap=sec('look','Look and layout',el('p',{style:'margin-bottom:var(--s-3)'},'Template: ',el('strong',{},tpl.name),' ',el('a',{class:'lw-btn sm',href:'#/templates'},'Change')),
   el('div',{class:'lw-field'},el('span',{class:'lw-help'},'Accent colour'),sw),
   ...[['Text size','fontSize',OPTIONS.fontSize],['Spacing','spacing',OPTIONS.spacing],['Margins','margins',OPTIONS.margins]].map(([l,k,o])=>el('div',{class:'lw-field'},el('span',{class:'lw-help'},l),seg(l,k,o,x=>x[0].toUpperCase()+x.slice(1)))));
  form.append(ap);
  if(act){const n=form.querySelector('[data-key="'+act+'"]');if(n)n.focus();}
 }
 const shape=s=>JSON.stringify([s.document.experience.map(i=>i.id+(i.title||i.employer||'')),s.document.education.map(i=>i.id+(i.degree||i.school||'')),s.document.skills.map(x=>x.name),s.appearance.color,s.appearance.template,s.appearance.fontSize,s.appearance.spacing,s.appearance.margins]);
 let last='',layout=null;
 function redraw(){
  const snap=ed.snapshot();layout=layoutFor(snap.document,snap.appearance);
  const w=prevWrap.clientWidth-32,fit=Math.max(0.3,Math.min(1.4,w/layout.paper.width)),scale=zoomMode.fit?fit:1;
  drawPages(pages,layout,scale||0.6);
 }
 const redrawSoon=debounceFrame(redraw);
 function sync(snap){
  undo.disabled=!snap.canUndo;redo.disabled=!snap.canRedo;
  for(const b of paperSeg.children)b.setAttribute('aria-pressed',String(b.dataset.v===snap.appearance.paper));
  for(const g of form.querySelectorAll('.lw-seg[aria-label="Text size"] button,.lw-seg[aria-label="Spacing"] button,.lw-seg[aria-label="Margins"] button')){const k={'Text size':'fontSize',Spacing:'spacing',Margins:'margins'}[g.parentElement.getAttribute('aria-label')];g.setAttribute('aria-pressed',String(g.dataset.v===snap.appearance[k]));}
  const st=store.status;status.className='lw-chip '+(st.state==='error'?'err':st.state==='saved'?'ok':'');
  status.textContent=st.state==='error'?'✖ Not saved: '+(st.detail||(
    st.error==='QUOTA'?'browser storage is full':st.error==='CONFLICT'?'another tab changed this CV':st.error==='UNCONFIRMED'?'confirm master editing first':'storage unavailable'))+'. Download an unsaved draft.':st.state==='saving'?'Saving…':'✓ Saved on this device';
  if(shape(snap)!==last){last=shape(snap);build(snap);}
  redrawSoon();
 }
 let off=ed.subscribe(sync);const offStore=store.subscribe(()=>sync(ed.snapshot()));
 const ro=typeof ResizeObserver==='function'?new ResizeObserver(()=>redrawSoon()):null;ro?.observe(prevWrap);
 const onKey=e=>{if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key==='z'&&!/INPUT|TEXTAREA/.test(document.activeElement?.tagName)){e.preventDefault();ed.undo();}
  if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.shiftKey&&e.key==='Z'))&&!/INPUT|TEXTAREA/.test(document.activeElement?.tagName)){e.preventDefault();ed.redo();}};
 document.addEventListener('keydown',onKey);
 sync(ed.snapshot());
 return {node:root,destroy:()=>{off();offStore();ro?.disconnect();document.removeEventListener('keydown',onKey);},focusPath(path){
  const t=form.querySelector('[data-path="'+path+'"]')||form.querySelector('[data-path^="'+path.replace(/\.[^.]+$/,'')+'"]');
  if(t){t.closest('details')&&(t.closest('details').open=true);wrap.dataset.tab='edit';t.focus();t.scrollIntoView({block:'center'});return true;}return false;}};
}
/* ====================== Templates ====================== */
export function templatesView(ctx){
 const {store}=ctx,root=el('div'),grid=el('div',{class:'lw-gallery'});let family='All';
 const filter=el('div',{class:'lw-seg',role:'group','aria-label':'Filter by style',style:'flex-wrap:wrap'},['All',...FAMILIES].map(f=>el('button',{type:'button','aria-pressed':String(f==='All'),on:{click:()=>{family=f;for(const b of filter.children)b.setAttribute('aria-pressed',String(b.textContent===f));draw();}}},f==='All'?f:f[0].toUpperCase()+f.slice(1))));
 root.append(el('header',{class:'lw-page-head'},el('div',{},el('h1',{id:'page-title',tabindex:'-1'},'Choose a template'),el('p',{},'Previews show your own CV. Switching never changes your words.')),filter));
 root.append(grid);
 function draw(){
  const s=store.editor.snapshot(),doc=store.hasContent()?s.document:SAMPLE_DOC();grid.replaceChildren();
  for(const t of TEMPLATES.filter(x=>family==='All'||x.family===family)){
   const lay=layoutFor(doc,{...s.appearance,template:t.id,color:t.color||s.appearance.color});
   grid.append(el('button',{type:'button',class:'lw-tpl','aria-pressed':String(s.appearance.template===t.id),on:{click:()=>{store.editor.setAppearance(applyTemplate(store.editor.snapshot().appearance,t.id));ctx.toast(t.name+' selected. Your content is unchanged.');draw();}}},thumbnail(lay),el('strong',{},t.name),el('small',{},t.family[0].toUpperCase()+t.family.slice(1)+(t.tokens.layout==='sidebar'?' · exports single column':''))));
  }
 }
 draw();return {node:root};
}
/* ====================== Check ====================== */
const SEV={error:['✖','Error','err'],warning:['▲','Warning','warn'],info:['ℹ','Tip','info']};
export function checkView(ctx){
 const {store}=ctx,root=el('div'),s=store.editor.snapshot();
 root.append(el('header',{class:'lw-page-head'},el('div',{},el('h1',{id:'page-title',tabindex:'-1'},'Check your CV'),el('p',{},'Local checks on the exact file you would send. They are suggestions, not a score, and cannot predict any employer’s system.'))));
 if(!store.hasContent()){root.append(el('div',{class:'lw-empty'},el('h3',{},'Nothing to check yet'),el('p',{},'Create or import a CV first.'),el('a',{class:'lw-btn primary',href:'#/home'},'Get started')));return {node:root};}
 const lay=layoutFor(s.document,s.appearance);
 const art={text:lay.text,pageCount:lay.pageCount,warnings:lay.warnings};
 const r=runAtsChecks({document:s.document,appearance:s.appearance,artifact:art});
 root.append(el('div',{class:'lw-stats',style:'margin-bottom:var(--s-5)'},[['Errors',r.counts.error,'err'],['Warnings',r.counts.warning,'warn'],['Tips',r.counts.info,'info'],['Pages',lay.pageCount,'']].map(([l,n,c])=>el('div',{class:'lw-card lw-stat'},el('span',{class:'lw-help'},l),el('strong',{},String(n))))));
 if(!r.findings.length)root.append(el('div',{class:'lw-card'},el('h2',{},'✓ No problems found'),el('p',{class:'lw-help'},'Nice work. Re-run after big edits.')));
 const ul=el('ul',{class:'lw-findings','aria-label':'Findings'});
 for(const f of r.findings){const [ic,label,cls]=SEV[f.severity];
  ul.append(el('li',{class:'lw-finding '+f.severity},el('span',{class:'ic','aria-hidden':'true'},ic),
   el('div',{},el('p',{},el('span',{class:'lw-visually-hidden'},label+': '),f.message),el('p',{class:'why'},f.explanation)),
   f.path?el('button',{type:'button',class:'lw-btn sm',on:{click:()=>ctx.goField(f.path)}},'Go to field'):null));}
 root.append(ul);
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

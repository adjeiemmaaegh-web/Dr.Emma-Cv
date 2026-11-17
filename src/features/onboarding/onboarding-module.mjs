/**
 * Group E FeatureModule 'onboarding': accessible guided journeys.
 * services: documentSource {load()->{document,appearance}|null}, documentSink {save({document,evidence?})->Promise},
 *           draftStore {load()->string|null, save(string), clear()} (optional: without it, "resume later" is explained as unavailable),
 *           navigation {go(route)} (optional), exporter {export(document,format)->Promise<{bytes,...}>} (optional).
 * Never writes storage itself; every commit goes through the host's sink after the user presses the final button.
 */
import {JOURNEYS,availability,startJourney,getView,submit,skip,back,finish,serializeDraft,restoreDraft} from './journeys.mjs';
import {createAnnouncer,focusHeading,el,uniqueId} from '../accessibility/a11y.mjs';
export const onboardingFeature=Object.freeze({
 id:'onboarding',dependencies:[],
 async mount({host,services}){
  const root=host.element;if(!root||typeof root.append!=='function')throw new TypeError('host.element is required');
  const wrap=el('section',{class:'ledger-a11y ledger-onboarding','aria-labelledby':'ob-h'});root.append(wrap);
  const ann=createAnnouncer(root); // lives outside the re-rendered section so announcements are not destroyed
  let existing=null;try{existing=(await services.documentSource?.load())||null;}catch{existing=null;}
  const hasDoc=!!existing?.document&&JSON.stringify(existing.document)!==undefined&&(existing.document.experience?.length||existing.document.summary||existing.document.personalInfo?.firstName);
  let state=null,errors=[],saving=false,result=null;
  const saveDraft=()=>{try{services.draftStore?.save(serializeDraft(state));}catch{}};
  const h=(text)=>{const n=el('h2',{id:'ob-h'},text);return n;};
  function entry(){
   wrap.replaceChildren(h('What would you like to do?'));
   const list=el('ul',{style:'list-style:none;padding:0'});
   for(const [kind,j] of Object.entries(JOURNEYS)){
    const a=availability(kind,{hasDocument:hasDoc}),descId=uniqueId('ob-d');
    const b=el('button',{type:'button','aria-describedby':descId,'aria-disabled':a.available?undefined:'true',on:{click:()=>{if(!a.available){ann.announce(a.reason);return;}state=startJourney(kind,{hasDocument:hasDoc});errors=[];saveDraft();render();}}},j.label);
    list.append(el('li',{style:'margin:.75rem 0'},b,el('p',{id:descId,class:'ledger-help'},j.blurb+(a.available?'':' '+a.reason))));
   }
   wrap.append(list);
   if(services.draftStore){let d=null;try{d=services.draftStore.load();}catch{}
    if(d)wrap.append(el('button',{type:'button',on:{click:()=>{try{state=restoreDraft(d);errors=[];render();}catch{services.draftStore.clear?.();ann.announce('The saved draft could not be read and was discarded.');entry();}}}},'Continue where I left off'));}
   else wrap.append(el('p',{class:'ledger-help'},'Saving a draft to continue later is not available here. Finish in one go, or export a backup.'));
   focusHeading(wrap.querySelector('#ob-h'));
  }
  function render(){
   const ctx={document:existing?.document,appearance:existing?.appearance};
   let view;try{view=getView(state,ctx);}catch(e){wrap.replaceChildren(h('Something went wrong'),el('p',{role:'alert'},e.message),el('button',{type:'button',on:{click:()=>{state=null;entry();}}},'Start again'));return;}
   const prog=el('progress',{max:'100',value:String(view.progress.percent),'aria-label':'Progress'});
   const head=h(view.title);
   wrap.replaceChildren(el('p',{},view.progress.label),prog,head);
   if(view.description)wrap.append(el('p',{},view.description));
   if(errors.length){
    const box=el('div',{role:'alert',tabindex:'-1',id:'ob-errors'},el('p',{class:'ledger-error'},'Please fix '+errors.length+(errors.length===1?' problem:':' problems:')));
    const ul=el('ul',{});for(const e of errors)ul.append(el('li',{},el('a',{href:'#f-'+e.field,on:{click:ev=>{ev.preventDefault();wrap.querySelector('#f-'+e.field)?.focus();}}},e.message)));
    box.append(ul);wrap.append(box);
   }
   const form=el('form',{novalidate:'',on:{submit:ev=>{ev.preventDefault();go(view,form);}}});
   if(view.kind==='form'){
    for(const f of view.fields){
     const id='f-'+f.id,helpId=id+'-help',errId=id+'-err',err=errors.find(e=>e.field===f.id);
     const desc=[f.help||f.example?helpId:'',err?errId:''].filter(Boolean).join(' ')||undefined;
     if(f.type==='checkbox'){const c=el('input',{type:'checkbox',id,name:f.id,checked:f.value||undefined});form.append(el('div',{class:'ledger-check'},c,el('label',{for:id,style:'margin:0;font-weight:400'},f.label)));continue;}
     const c=f.type==='textarea'?el('textarea',{id,name:f.id,rows:'5'}):el('input',{id,name:f.id,type:f.type});
     c.value=f.value;if(f.autocomplete)c.setAttribute('autocomplete',f.autocomplete);
     if(f.required)c.setAttribute('aria-required','true');if(err)c.setAttribute('aria-invalid','true');if(desc)c.setAttribute('aria-describedby',desc);
     form.append(el('label',{for:id},f.label+(f.required?' (required)':'')),c);
     if(f.help||f.example)form.append(el('p',{id:helpId,class:'ledger-help'},(f.help?f.help+' ':'')+(f.example?'Example only: '+f.example:'')));
     if(err)form.append(el('p',{id:errId,class:'ledger-error'},err.message));
    }
   }else if(view.kind==='review'){
    const fs=el('fieldset',{},el('legend',{},'Found in your CV'));
    for(const w of view.warnings)fs.append(el('p',{class:'ledger-help'},w));
    for(const it of view.items){const id=uniqueId('ob-i');fs.append(el('div',{class:'ledger-check'},el('input',{type:'checkbox',id,value:it.path,checked:it.checked||undefined}),el('label',{for:id,style:'margin:0;font-weight:400'},it.label+(it.uncertain?' (please check this one)':''))));}
    form.append(fs);
    const err=errors.find(e=>e.field==='accepted');if(err)form.append(el('p',{class:'ledger-error',id:'f-accepted'},err.message));
   }else if(view.kind==='report'){
    if(view.empty)form.append(el('p',{},view.empty));
    const ul=el('ul',{});for(const r of view.rows)ul.append(el('li',{},el('strong',{},(r.severity||r.status||'')+': '),r.text,r.why?el('span',{class:'ledger-help'},' '+r.why):''));
    form.append(ul);if(view.disclaimer)form.append(el('p',{class:'ledger-help'},view.disclaimer));
   }else if(view.kind==='finish'){
    form.append(el('p',{},finishText()));
    if(result?.saved)form.append(el('p',{role:'status'},'Saved to this device.'));
   }
   const bar=el('div',{role:'group','aria-label':'Navigation',style:'display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem'});
   if(view.canGoBack)bar.append(el('button',{type:'button',on:{click:()=>{state=back(state);errors=[];saveDraft();render();}}},'Back'));
   if(view.optional&&view.kind==='form')bar.append(el('button',{type:'button',on:{click:()=>{state=skip(state);errors=[];saveDraft();render();}}},'Skip this step'));
   bar.append(el('button',{type:'submit',disabled:saving||undefined},view.kind==='finish'?(state.kind==='tailor'||state.kind==='improve'?'Done':'Save my CV'):'Next'));
   bar.append(el('button',{type:'button',on:{click:()=>{saveDraft();state=null;errors=[];entry();}}},'Stop and finish later'));
   form.append(bar);wrap.append(form);
   if(errors.length){ann.announce(errors.length+' problem'+(errors.length===1?'':'s')+' to fix');wrap.querySelector('#ob-errors')?.focus();}
   else{ann.announce(view.progress.label);focusHeading(head);}
  }
  const finishText=()=>({create:'Your CV is built from your answers. Press "Save my CV" to keep it on this device. You can export it as PDF or Word afterwards.',import:'Only the items you ticked will be added. Nothing else from the pasted text is kept.',improve:'You can fix these in the editor at any time.',tailor:'We prepared suggestions. Nothing changes in your CV until you approve each one.'}[state.kind]);
  async function go(view,form){
   if(view.kind==='finish'){
    if(saving)return;
    try{const out=finish(state,ctx());
     if(state.kind==='create'||state.kind==='import'){saving=true;render();await services.documentSink.save(out);result={saved:true};services.draftStore?.clear?.();saving=false;state=null;entry();ann.announce('Saved to this device.');return;}
     services.draftStore?.clear?.();state=null;entry();
    }catch(e){saving=false;errors=[];render();ann.announce('Not saved: '+(e?.message||'storage problem')+'. Your answers are still here.');wrap.append(el('p',{role:'alert',class:'ledger-error'},'Not saved: '+(e?.message||'storage problem')+'. Your answers are still here; try again or export a backup.'));}
    return;
   }
   const values={};
   if(view.kind==='review')values.accepted=[...form.querySelectorAll('input[type=checkbox]:checked')].map(i=>i.value);
   else for(const f of form.querySelectorAll('[name]'))values[f.name]=f.type==='checkbox'?f.checked:f.value;
   const r=submit(state,values,ctx());errors=r.errors;
   if(!errors.length){state=r.state;saveDraft();}
   else state={...state,answers:{...state.answers,[view.id]:{...(state.answers[view.id]||{}),...Object.fromEntries(Object.entries(values).filter(([k])=>view.fields?.some(f=>f.id===k)))}}};
   render();
  }
  const ctx=()=>({document:existing?.document,appearance:existing?.appearance});
  entry();
  return ()=>{ann.destroy();wrap.remove();};
 }
});

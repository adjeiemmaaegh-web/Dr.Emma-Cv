/**
 * A file-to-CV review panel for the persistent workspace.
 * It does not edit the current master: approvals create an independent profile.
 * All source text, edits and bytes stay in this browser and are not persisted.
 */
import {el} from './ui.mjs';
import {createLocalFileImportReview} from '../../import/local-file.mjs';
import {reviewPdfManualTranscription} from '../../import/pdf-import.mjs';
import {approveImportReview} from '../../import/text-import.mjs';

const escapeHtml=value=>String(value||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const toParagraphs=value=>String(value||'').split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean)
 .map(s=>'<p>'+escapeHtml(s).replace(/\n/g,' ')+'</p>').join('');
const fromHtml=value=>String(value||'').replace(/<li\b[^>]*>/gi,'\n• ').replace(/<\/(?:p|div|li)>/gi,'\n')
 .replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
const title=(str)=>el('strong',{},str);
const textField=(label,value,change,{multiline=false}={})=>{
 const input=el(multiline?'textarea':'input',multiline?{rows:'4',maxlength:'60000'}:{type:'text',maxlength:'4000'});
 input.value=String(value??'');
 input.addEventListener('input',()=>change(input.value));
 return el('label',{class:'lw-field'},el('span',{},label),input);
};
/**
 * Field-level collection editing must NEVER flatten metadata (issuer, date, URL,
 * original description or user-supplied skill level) while changing a single name.
 * The source list remains the baseline until the reviewer explicitly excludes
 * an entry. Other entries retain their original object identity and properties.
 */
export function createCollectionReviewModel(doc,path){
 const allowed=new Set(['skills','languages','certifications','projects','accomplishments','customSections']);
 if(!allowed.has(path)||!Array.isArray(doc?.[path]))throw new TypeError('Unsupported CV collection');
 const rows=doc[path].map(value=>({value,include:true}));
 const sync=()=>{doc[path]=rows.filter(r=>r.include).map(r=>r.value);};
 return {
  rows,
  set(row,key,value){
   if(!rows.includes(row)||typeof key!=='string'||!key||typeof value!=='string')
    throw new TypeError('Invalid review edit');
   row.value[key]=value;
   sync();
  },
  include(row,yes){
   if(!rows.includes(row)||typeof yes!=='boolean')throw new TypeError('Invalid review selection');
   row.include=yes;sync();
  }
 };
}

export function reviewFieldEditors(item,doc){
 const path=item.path,parts=[];
 if(path==='personalInfo.name'){
  parts.push(textField('First name — check spelling',doc.personalInfo.firstName,v=>{doc.personalInfo.firstName=v;}));
  parts.push(textField('Last name — check spelling',doc.personalInfo.lastName,v=>{doc.personalInfo.lastName=v;}));
 }else if(path.startsWith('personalInfo.')){
  const key=path.split('.')[1];
  parts.push(textField(key,doc.personalInfo[key],v=>{doc.personalInfo[key]=v;}));
 }else if(['summary','hobbies','references'].includes(path)){
  parts.push(textField(path,doc[path],v=>{doc[path]=v;},{multiline:true}));
 }else{
  const m=path.match(/^(experience|education)\[(\d+)\]$/);
  if(m){
   const itemDoc=doc[m[1]][Number(m[2])];
   for(const key of m[1]==='experience'?['title','employer','location','start','end']:['degree','school','start','end']){
    parts.push(textField(key,itemDoc[key],v=>{itemDoc[key]=v;if(key==='end'&&m[1]==='experience')itemDoc.current=!v.trim()&&!!String(itemDoc.start||'').trim();}));
   }
   parts.push(textField('Description / evidence — edit only if source is wrong',fromHtml(itemDoc.description),v=>{itemDoc.description=toParagraphs(v);},{multiline:true}));
  }else if(['skills','languages','certifications','projects','accomplishments','customSections'].includes(path)){
   const model=createCollectionReviewModel(doc,path);
   const fieldNames={
    skills:['name'],languages:['name','proficiency'],
    certifications:['name','issuer','date','url'],
    projects:['name','title','url','description'],
    accomplishments:['name','title','description'],
    customSections:['title','content']
   }[path];
   for(const [index,row] of model.rows.entries()){
    const enabled=el('input',{type:'checkbox','aria-label':'Include '+path+' item '+(index+1)});
    enabled.checked=true;
    enabled.addEventListener('change',()=>model.include(row,enabled.checked));
    const entry=el('fieldset',{class:'lw-field'},el('legend',{},path+' entry '+(index+1)),
     el('label',{},enabled,' Include this entry'));
    for(const key of fieldNames){
     if(!(key in row.value)&&key!=='name')continue;
     const original=row.value[key];
     const value=key==='description'||key==='content'?fromHtml(original):original;
     entry.append(textField(key,value,v=>model.set(row,key,key==='description'||key==='content'?toParagraphs(v):v),
      {multiline:key==='description'||key==='content'}));
    }
    // Explicitly show all additional metadata, including unrecognized export
    // fields; these are retained unchanged if the reviewer edits another field.
    const extra=Object.keys(row.value).filter(k=>!fieldNames.includes(k));
    if(extra.length)entry.append(el('p',{class:'lw-help'},
     'Preserved other fields: '+extra.join(', ')+'. Editing this entry will not erase them.'));
    parts.push(entry);
   }
  }
 }
 return parts;
}
export function createWorkspaceCvImportPanel(ctx){
 const {store}=ctx,root=el('section',{class:'lw-card','aria-label':'Import an existing CV'}),
  heading=el('h2',{},'Import your existing CV — with review'),
  info=el('p',{class:'lw-help'},'Choose a local PDF, DOCX, TXT or HTML file. We extract it on this device, show the source beside editable proposed fields, and create a NEW separate profile only after your approval. The original CV is never overwritten.'),
  picker=el('input',{type:'file',accept:'.pdf,.docx,.txt,.html,.htm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/html',
   'aria-label':'Select existing CV PDF DOCX TXT or HTML'}),
  status=el('p',{role:'status','aria-live':'polite',class:'lw-help'},'No CV file has been read.'),
  reviewBox=el('div');
 let current=null,sourceFile=null,sourceUrl=null,loading=false;
 const tell=message=>{status.textContent=message;};
 const reset=()=>{if(sourceUrl){URL.revokeObjectURL(sourceUrl);sourceUrl=null;}current=null;sourceFile=null;reviewBox.replaceChildren();};
 picker.addEventListener('change',()=>{reset();tell('File selected. Click Extract to review; nothing is imported yet.');});
 async function extract(){
  if(loading)return;
  const f=picker.files?.[0];if(!f)throw Error('Choose a CV file first.');
  loading=true;reset();
  try{
   const r=await createLocalFileImportReview(f);
   if(f!==picker.files?.[0])throw Error('The selected file changed during extraction. Choose the file again.');
   current=r;sourceFile=f;
   if(r.format==='pdf')sourceUrl=URL.createObjectURL(f);
   tell(r.status==='blocked'?'Import is blocked; inspect the extraction warnings and use a complete readable source.':
    'Extracted locally. Select and edit the information you want in a new independent CV.');
   display(r);
  }finally{loading=false;}
 }
 const safeClick=fn=>async()=>{try{await fn();}catch(e){tell('Not completed: '+(e?.message||'unknown error')+'. Your existing CV is unchanged.');}};
 const btn=(label,action)=>el('button',{type:'button',class:'lw-btn',on:{click:safeClick(action)}},label);
 function display(review){
  const source=el('textarea',{readonly:true,rows:'18','aria-label':'Original extracted CV text for comparison'});
  source.value=review.sourceText||'';
  const candidate=review.proposed?.master.document;
  const editable=el('div');
  const choices=[];
  if(candidate&&review.status==='review-required'){
   for(const it of review.items){
    const control=el('input',{type:'checkbox','aria-label':'Accept imported '+it.path});
    const editors=reviewFieldEditors(it,candidate);
    choices.push({path:it.path,control});
    editable.append(el('details',{class:'lw-sec'},el('summary',{},
     control,title(' '+it.path+(it.uncertain?' — uncertain':'')+
      (it.sourceLine?' (source line '+it.sourceLine+')':'')+
      (it.sourceRef?' — '+it.sourceRef:''))),
     el('div',{class:'lw-sec-body'},...editors)));
   }
   editable.append(btn('Create new CV profile from approved fields',async()=>{
    if(current!==review||sourceFile!==picker.files?.[0])throw Error('File changed since review. Extract it again.');
    const accepted=choices.filter(x=>x.control.checked).map(x=>x.path);
    if(!accepted.length)throw Error('Choose at least one reviewed field.');
    if(!confirm('Create a NEW independent CV profile from '+accepted.length+' reviewed item(s)? The currently saved CV will remain a separate profile.'))return;
    const profile=approveImportReview(review,{accepted,confirmed:true});
    await store.importProfile(profile,{confirmed:true});
    reset();
    ctx.go('#/editor');
   }));
  }else editable.append(el('p',{role:'alert'},'Cannot approve this incomplete extraction. Choose a complete source or repair the document first.'));
  const left=el('div',{},el('h3',{},'Source text (read-only)'),source,
    el('p',{class:'lw-help'},'Compare titles, organisations, dates, bullets and contact details against the original PDF or Word file.'));
  if(review.pages){
   left.append(el('p',{class:'lw-help'},'PDF pages: '+review.pages.map(p=>p.page+' ('+p.method+')').join(', ')));
   if(sourceUrl)left.append(el('a',{href:sourceUrl,target:'_blank',rel:'noopener noreferrer'},'View the original selected PDF locally for page-by-page checking'));
   if(review.status==='blocked'&&review.missingPages?.length){
    const notes=el('p',{class:'lw-help'},'This PDF has scanned or empty-text page(s). You can manually transcribe ALL missing pages using the original PDF, then explicitly request another review. No OCR result is assumed.');
    const typed={};
    const fields=review.missingPages.map(n=>textField('Complete manual transcription of PDF page '+n,'',v=>{typed[n]=v;},{multiline:true}));
    const checked=el('input',{type:'checkbox','aria-label':'I checked every missing PDF page against the original'});
    const consent=el('label',{class:'lw-field'},checked,' I transcribed and checked every missing page from the original PDF.');
    left.append(notes,...fields,consent,
     btn('Reconstruct review using my checked page transcriptions',async()=>{
      if(!checked.checked)throw Error('Check the complete-page transcription confirmation first.');
      if(sourceFile!==picker.files?.[0]||current!==review)throw Error('The source file or review changed. Extract again.');
      const corrected=reviewPdfManualTranscription(review,{transcriptions:typed,confirmed:true});
      current=corrected;
      tell('Manually transcribed PDF pages added to a NEW review. Confirm every proposed field before saving.');
      display(corrected);
     }));
   }
  }
  const right=el('div',{},el('h3',{},'Reviewed CV fields — edit before approval'),editable);
  const columns=el('div',{style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr));gap:var(--s-4);align-items:start'},
   left,right);
  reviewBox.replaceChildren(...review.warnings.map(w=>el('p',{class:'lw-help'},w)),columns);
 }
 root.append(heading,info,picker,btn('Extract selected CV for review',extract),status,reviewBox);
 return {node:root,destroy:reset};
}

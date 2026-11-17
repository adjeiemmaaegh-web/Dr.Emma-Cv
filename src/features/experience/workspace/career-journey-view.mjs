/**
 * Human-led, offline career journey: saved vacancies -> reviewed variants ->
 * fact-checked letters -> linked applications -> interview and LinkedIn.
 * User text is rendered with text nodes, never injected as HTML. No network calls.
 */
import {el,download} from './ui.mjs';
import {createIndexedDBCareerJourneyStore,createMemoryCareerJourneyStore,emptyCareerJourney} from '../../../domain/storage/career-journey-store.mjs';
import {parseJobText,compareToDocument,buildTailoringSuggestions} from '../../intelligence/index.mjs';
import {createLetterDraft,reviseLetter,checkLetterFacts,exportLetter} from '../../cover-letter/letter.mjs';
import {renderInterviewCoach} from './interview-coach-view.mjs';
import {fromPastedText,fromOfficialExport,fromOfficialZip,coachLinkedIn} from '../../linkedin-coach/linkedin.mjs';
import {linkedinToCvReview} from '../../linkedin-coach/to-cv.mjs';
import {approveImportReview} from '../../import/text-import.mjs';
import {REGIONS,regionChecks} from '../../career-region/regions.mjs';
import {addApplication,linkDocuments} from '../../tracker/tracker.mjs';
let persistentRepository;
const field=(name,node)=>el('label',{class:'lw-field'},el('span',{},name),node);
const textInput=(value='',length=200)=>{const i=el('input',{type:'text',maxlength:String(length)});i.value=value||'';return i;};
const area=(value='',rows=5,max=60000)=>{const t=el('textarea',{rows:String(rows),maxlength:String(max)});t.value=value||'';return t;};
const section=(name,...contents)=>el('section',{class:'lw-card',style:'margin-bottom:var(--s-4)'},el('h2',{style:'margin-bottom:var(--s-3)'},name),...contents);
const items=(values,make)=>el('ul',{class:'lw-findings'},values.map(make));
const title=(label)=>el('h1',{id:'page-title',tabindex:'-1'},label);
export function careerJourneyView(ctx){
 const {store}=ctx,stable=store.mode==='persistent',id=stable?store.profile.id:'sampleCareer001';
 let repository;
 try{repository=stable?(persistentRepository??=createIndexedDBCareerJourneyStore()):createMemoryCareerJourneyStore();}
 catch(e){return {node:section('Career tools unavailable',el('p',{role:'alert'},e.message))};}
 const root=el('div',{class:'lw-career'}),feedback=el('p',{role:'status','aria-live':'polite',class:'lw-help'});
 const content=el('div');
 root.append(el('header',{class:'lw-page-head'},el('div',{},title('Career journey'),el('p',{},'Local, evidence-first job matching, cover letters, applications and interview preparation. No data is sent to a service.'))),feedback,content);
 let state=emptyCareerJourney(id),revision=null,busy=false,destroyed=false;
 const notice=t=>{feedback.textContent=t;};
 const run=fn=>async()=>{
  if(busy||destroyed)return;
  busy=true;
  try{await fn()}catch(e){notice('Not completed: '+(e?.message||'unknown problem')+'. Your current work remains on screen.');}
  finally{busy=false}
 };
 const button=(label,fn,primary=false)=>el('button',{type:'button',class:'lw-btn'+(primary?' primary':''),on:{click:run(fn)}},label);
 const cv=()=>stable?store.selectedCV:{id:'sampleCV0001',revision:0,document:store.editor.snapshot().document,appearance:store.editor.snapshot().appearance};
 const baseCV=()=>stable?store.profile.master.document:store.editor.snapshot().document;
 async function commit(next,message){
  const saved=await repository.save(id,next,revision);
  if(destroyed)return;
  state=saved.value;revision=saved.revision;
  draw();notice(message+' Saved locally for this profile.');
 }
 function downloadBackup(){
  const bytes=JSON.stringify({format:'ledger-career-journey-manual-backup',version:1,
   exportedAt:new Date().toISOString(),profileId:id,journey:state,
   warning:'This unencrypted manual backup includes private career material. Keep it secure. Import is not available yet.'},null,2);
  download(bytes,'career-journey-backup.json','application/json');
  notice('Downloaded an unencrypted manual backup. Keep it private.');
 }
 function draw(){
  if(destroyed)return;
  content.replaceChildren();
  content.append(section('Local career data',
   el('p',{class:'lw-help'},stable?'Vacancy, letter and interview drafts are saved to an independent IndexedDB record for this profile. Applications and CV versions use their own protected stores.':'Sample preview: drafts last only until you close this page.'),
   button('Download career journey backup',()=>downloadBackup())));
  const job=state.job,role=textInput(job?.role||''),employer=textInput(job?.employer||''),raw=area(job?.originalText||'',7);
  content.append(section('1. Understand a vacancy',
   el('p',{class:'lw-help'},'Paste the actual job advert. The parser recognises requirement bullets; results are not a hiring prediction.'),
   field('Job title',role),field('Employer',employer),field('Job advert text',raw),
   button('Analyse and save vacancy',async()=>{
    if((state.letter||state.session)&&!confirm('Replacing the vacancy also clears the current letter and interview draft. Download a backup first if you need them. Continue?'))return;
    const parsed=parseJobText(raw.value,{role:role.value.trim()||undefined,employer:employer.value.trim()||undefined});
    await commit({...state,job:parsed.job,letter:null,session:null},'Vacancy analysed.');
    if(parsed.warnings.length)notice('Vacancy saved with parser notes: '+parsed.warnings.join(' '));
   },true)));
  if(job){
   const base=baseCV(),comparison=compareToDocument(job,base),
    recommendations=buildTailoringSuggestions({document:base,job,comparison});
   const list=items(comparison.results,(r)=>el('li',{class:'lw-finding '+(r.status==='no-evidence'?'warning':'info')},
    el('div',{},el('strong',{},r.requirement),el('p',{class:'lw-help'},'Assessment: '+r.status+'. '+(r.citations?.length?'Evidence: '+r.citations.map(c=>c.excerpt).join('; '):(r.note||'No CV evidence found.'))))));
   const chosen=[];
   const proposals=el('div');
   for(const sg of recommendations.suggestions){
    const check=el('input',{type:'checkbox','aria-label':'Approve '+sg.id});
    const edit=sg.operation?.type==='set-summary'?area(sg.after,2,4000):null;
    proposals.append(el('div',{class:'lw-field'},el('label',{},check,' Review and approve: '+sg.explanation),
     el('p',{class:'lw-help'},'Before: '+(sg.before||'(empty)')),
     edit?field('Approved wording (checked again for invented facts)',edit):el('p',{},'Proposed: '+sg.after)));
    chosen.push({sg,check,edit});
   }
   const variantName=textInput('Tailored CV',120);
   content.append(section('2. Compare and tailor your master CV',
    el('p',{class:'lw-help'},'Citations are matched against your saved master CV, not independently verified facts. Missing skills are never added automatically.'),
    list,
    ...(recommendations.prompts.length?[items(recommendations.prompts,p=>el('li',{class:'lw-finding info'},p.message))]:[]),
    proposals,
    field('New CV version name',variantName),
    button('Create approved CV version',async()=>{
     if(!stable)throw Error('A saved workspace is required to create a CV version');
     const decisions=Object.fromEntries(chosen.filter(x=>x.check.checked).map(x=>[x.sg.id,x.edit?{status:'approved',after:x.edit.value}:'approved']));
     const outcome=await store.applyJobTailoring({job,suggestions:recommendations.suggestions,decisions,name:variantName.value.trim()||'Tailored CV'});
     notice('Created tailored version ('+outcome.applied.length+' approved changes). The master is unchanged.');
     ctx.go('#/editor');
    },true)));
   const v=cv(),letter=state.letter,letterBox=el('div');
   if(!letter)letterBox.append(button('Start cover letter draft',async()=>{
    const draft=createLetterDraft({variant:v,job});
    await commit({...state,letter:draft},'Cover letter draft created.');
   }));
   else{
    const body=area(letter.structure.body.join('\n\n'),7,35000);
    const check=checkLetterFacts(letter,{variant:v,job});
    letterBox.append(el('p',{class:'lw-help'},'Linked to CV '+letter.cvVariantId+' at revision '+letter.cvRevisionAtDraft+'. Review any flagged facts before export.'),
     field('Letter body paragraphs (separate with blank lines)',body),
     button('Save letter edits',async()=>{
      const paras=body.value.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
      const updated=reviseLetter(letter,{body:paras},{expectedRevision:letter.revision});
      await commit({...state,letter:updated},'Letter edits');
     }),
     el('pre',{class:'lw-help',style:'white-space:pre-wrap;overflow-wrap:anywhere'},letter.content),
     items(check.map(x=>({severity:x.severity,message:x.message})),x=>el('li',{class:'lw-finding '+(x.severity==='error'?'warning':'info')},x.message)),
     ...['pdf','docx'].map(format=>button('Export letter '+format.toUpperCase(),async()=>{
      const findings=checkLetterFacts(letter,{variant:cv(),job}).filter(x=>x.severity==='error');
      if(findings.length&&!confirm('The fact check flagged '+findings.length+' possible problems. Only export if you have independently reviewed every claim. Continue?'))return;
      const file=exportLetter(letter,{cvAppearance:cv().appearance},format);
      download(file.bytes,'cover-letter.'+format,file.mime);
      notice('Cover letter downloaded. Verify the file in a native viewer before submitting.');
     })));
   }
   content.append(section('3. Cover letter',letterBox));
   content.append(section('4. Link a job application',
    el('p',{class:'lw-help'},'Save a new application with the exact selected CV revision. The document link is a separate checked application update.'),
    button('Save application and link CV',async()=>{
     if(!stable)throw Error('Only the saved workspace supports application tracking');
     const now=cv(),b=store.applications;
     store.setApplications(addApplication(b,{company:job.employer||'',role:job.role,jobText:job.originalText,jobTargetId:job.id,expectedRevision:b.revision}));
     await store.saveNow();
     const after=store.applications,created=after.applications[after.applications.length-1];
     const links={cvVariantId:now.id,cvRevision:now.revision,expectedRevision:after.revision};
     if(state.letter&&state.letter.cvVariantId===now.id){links.coverLetterId=state.letter.id;links.coverLetterRevision=state.letter.revision;}
     store.setApplications(linkDocuments(after,created.id,links));await store.saveNow();
     notice('Application saved and linked to exact CV revision '+now.revision+'.');
     ctx.go('#/jobs');
    },true)));
   const session=state.session?.jobTargetId===job.id?state.session:null;
   content.append(renderInterviewCoach({job,cv:v,session,
    saveSession:async(next,label)=>commit({...state,session:next},label),
    button,notice,section}));

  }
  const linkIn=area('',5);
  const linkedFiles=el('input',{type:'file',accept:'.zip,.csv,application/zip,text/csv',multiple:true,
   'aria-label':'Choose LinkedIn export ZIP or selected official CSV files'});
  const linkResults=el('div',{'aria-live':'polite'});
  const reviewedFields=el('div',{'aria-live':'polite'});
  let linkedProfile=null,linkedReview=null,reviewChoices=[];
  const readLinkedInFiles=async()=>{
   const selected=[...(linkedFiles.files||[])];
   if(!selected.length)throw Error('Select your own official LinkedIn ZIP or CSV files.');
   if(selected.length===1&&/\.zip$/i.test(selected[0].name)){
    if(selected[0].size>24*1024*1024)throw Error('Selected ZIP exceeds 24 MB.');
    return fromOfficialZip(new Uint8Array(await selected[0].arrayBuffer()));
   }
   if(selected.some(f=>!/\.csv$/i.test(f.name)))throw Error('Select one ZIP or individual official CSV files, not a mixture.');
   const names=new Map([['profile.csv','profileCsv'],['positions.csv','positionsCsv'],['skills.csv','skillsCsv'],
    ['education.csv','educationCsv'],['certifications.csv','certificationsCsv'],['projects.csv','projectsCsv']]);
   const input={};
   for(const f of selected){
    const key=names.get(f.name.toLowerCase());
    if(!key)continue; // Connections, Messages and all other unrelated files are not read.
    if(input[key]!==undefined)throw Error('Duplicate LinkedIn '+f.name+'; choose one source file per category.');
    if(f.size>4*1024*1024)throw Error(f.name+' exceeds the local CSV size limit.');
    input[key]=await f.text();
   }
   return fromOfficialExport(input);
  };
  const showLinkedIn=profile=>{
   linkedProfile=profile;linkedReview=null;reviewedFields.replaceChildren();
   const result=coachLinkedIn(profile,cv().document);
   linkResults.replaceChildren(el('p',{class:'lw-help'},result.notice),
    el('p',{class:'lw-help'},'Findings: '+result.findings.length+'. Review every discrepancy against its original source; missing export categories are not treated as absent LinkedIn facts.'),
    items(result.findings,f=>el('li',{class:'lw-finding '+(f.severity==='warning'?'warning':'info')},f.message)),
    ...result.suggestions.map(s=>field('Suggested '+s.path+' — manually review before copying',area(s.after,3,3500))));
   notice('LinkedIn analysis completed locally. No LinkedIn website was accessed or data uploaded.');
  };
  const previewLinkedInReconstruction=()=>{
   if(!linkedProfile)throw Error('First review a pasted profile or the selected official export.');
   linkedReview=linkedinToCvReview(linkedProfile);
   reviewChoices=[];
   reviewedFields.replaceChildren(
    el('p',{class:'lw-help'},'Nothing has changed in your saved CV. Choose individual fields for a NEW separate career profile. Unselected fields are omitted.'),
    ...linkedReview.warnings.map(w=>el('p',{class:'lw-help'},w)),
    ...linkedReview.items.map(item=>{
     const control=el('input',{type:'checkbox','aria-label':'Accept '+item.path});
     reviewChoices.push({control,path:item.path});
     const preview=typeof item.value==='string'?item.value:JSON.stringify(item.value);
     return el('label',{class:'lw-field',style:'display:flex;gap:var(--s-2);align-items:flex-start'},
      control,el('span',{},item.path+(item.uncertain?' — uncertain':'')+
       (item.sourceRef?' ('+item.sourceRef+')':'')+': '+preview.slice(0,200)));
    }),
    button('Create separate profile from selected fields',async()=>{
     if(!linkedReview||!stable||typeof store.importProfile!=='function')
      throw Error('Saving imported profiles is unavailable in sample mode. Use the persistent workspace.');
     const accepted=reviewChoices.filter(x=>x.control.checked).map(x=>x.path);
     if(!accepted.length)throw Error('Select at least one reviewed field first.');
     if(!confirm('Create a new separate career profile from '+accepted.length+' approved LinkedIn field(s)? Your existing CV remains saved as a separate profile.'))
      return;
     const approved=approveImportReview(linkedReview,{accepted,confirmed:true});
     await store.importProfile(approved,{confirmed:true});
     linkedReview=null;linkedProfile=null;
     notice('Approved fields saved to a separate local CV profile. The original profile was not overwritten.');
     draw();
    },true));
  };
  content.append(section('6. LinkedIn consistency coach',
   el('p',{class:'lw-help'},'Paste your own profile text or choose your LinkedIn-provided ZIP/CSV export. Files stay in this browser; unrelated connection/message files are ignored. No scraping, login or automatic LinkedIn changes.'),
   field('Your pasted LinkedIn profile text',linkIn),
   button('Check LinkedIn against my CV',async()=>showLinkedIn(fromPastedText(linkIn.value))),
   field('Official LinkedIn archive or selected Profile/Positions/Skills/Education/Certifications/Projects CSV files',linkedFiles),
   button('Review selected official LinkedIn export',async()=>showLinkedIn(await readLinkedInFiles())),
   linkResults,
   button('Review LinkedIn-to-CV reconstruction',async()=>previewLinkedInReconstruction()),
   reviewedFields));
  const region=el('select',{'aria-label':'Country guidance'},REGIONS.map(r=>el('option',{value:r.id},r.name)));
  const regionResult=el('div');
  const updateRegion=()=>{const data=regionChecks(region.value,{document:cv().document,appearance:cv().appearance});
   regionResult.replaceChildren(el('p',{class:'lw-help'},data.disclaimer),
    items(data.findings,x=>el('li',{class:'lw-finding info'},x.message)));};
  region.addEventListener('change',updateRegion);updateRegion();
  content.append(section('7. Regional CV guidance',field('Job market',region),regionResult));
 }
 repository.load(id).then(found=>{
  if(destroyed)return;
  if(found){state=found.value;revision=found.revision;}
  draw();notice(stable?'Career drafts loaded from this device.':'Sample-only preview; drafts are not persistent.');
 }).catch(e=>{if(destroyed)return;notice('Career drafts unavailable: '+e.message);content.replaceChildren(el('p',{role:'alert'},'Existing saved data was left unchanged.'));});
 return {node:root,destroy(){destroyed=true;}};
}

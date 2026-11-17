/**
 * Group E interview-coaching experience. Everything works offline; source links
 * open only when the user chooses to visit them. No AI/network request is made.
 */
import {el,download} from './ui.mjs';
import {emptySession,addStory,updateStory,startPractice,finishPractice} from '../../interview/interview.mjs';
import {
 buildInterviewPlan,coachInterviewAnswer,assembleSTARAnswer,prepareOptionalAIPrompt,
 reviewAIDraft,saveCoachingReview,addReviewedResearchSource,
 buildCompanyRoleBrief,exportInterviewWorkbook,safeResearchUrl
} from '../../interview/advanced-coach.mjs';

const option=(value,label)=>el('option',{value},label);
const input=(value='',max=240)=>{const n=el('input',{type:'text',maxlength:String(max)});n.value=value;return n};
const area=(value='',rows=4,max=8000)=>{const n=el('textarea',{rows:String(rows),maxlength:String(max)});n.value=value;return n};
const labeled=(label,node)=>el('label',{class:'lw-field'},el('span',{},label),node);
const para=text=>el('p',{class:'lw-help'},text);
const list=(values,render)=>el('ul',{class:'lw-findings'},values.map(render));
const finding=(text,warning=false)=>el('li',{class:'lw-finding '+(warning?'warning':'info')},text);
const buttonGroup=(...nodes)=>el('div',{class:'lw-actions',style:'display:flex;flex-wrap:wrap;gap:var(--s-2)'},...nodes);

export function renderInterviewCoach({job,cv,session,saveSession,button,notice,section}){
 const document=cv.document;
 const current=session||emptySession({jobTargetId:job.id});
 const plan=buildInterviewPlan({job,document}),brief=buildCompanyRoleBrief({job,session:current});
 const root=el('div');
 root.append(para('Questions are tied to your job posting and CV. No question assumes an unverified achievement. Local coaching is rules-based, not a generative-AI score.'));
 root.append(el('h3',{},'Tailored interview questions'));
 root.append(list(plan,q=>el('li',{class:'lw-finding info'},
  el('strong',{},q.source+': '),q.text,
  para(q.coachingHint),
  ...q.evidence.map(e=>para('Possible CV evidence ('+e.path+'): '+e.excerpt))
 )));
 const questionPick=el('select',{'aria-label':'Practice question'},plan.map(q=>option(q.id,q.text.slice(0,140))));
 const selectedQuestion=()=>plan.find(q=>q.id===questionPick.value)||plan[0];
 root.append(labeled('Choose a practice question',questionPick));

 root.append(el('h3',{},'Create or improve a truthful STAR story'));
 const storyPick=el('select',{'aria-label':'Saved STAR story'},
  option('','Create a new STAR story'),...current.stories.map(x=>option(x.id,x.title||'Untitled story')));
 const parts={
  title:input('',200),context:area('',3,3000),task:area('',3,3000),
  actions:area('',3,3000),results:area('',3,3000)
 };
 const storyValue=()=>Object.fromEntries(Object.entries(parts).map(([key,node])=>[key,node.value]));
 const loadStory=()=>{
  const saved=current.stories.find(st=>st.id===storyPick.value)||{};
  for(const [key,node] of Object.entries(parts))node.value=saved[key]||'';
 };
 storyPick.addEventListener('change',loadStory);
 root.append(labeled('Existing story to edit (optional)',storyPick),
  labeled('Story title',parts.title),
  labeled('Situation — what actually happened?',parts.context),
  labeled('Task — what were you responsible for?',parts.task),
  labeled('Action — what did you personally do?',parts.actions),
  labeled('Result — what happened (only true outcomes)?',parts.results),
  button('Save STAR story',async()=>{
   const values=storyValue(),chosen=current.stories.find(st=>st.id===storyPick.value);
   const updated=chosen
    ?updateStory(current,chosen.id,values,{expectedRevision:current.revision})
    :addStory(current,{...values,expectedRevision:current.revision});
   await saveSession(updated,'STAR story');
  },true));
 if(current.stories.length)root.append(para(current.stories.length+' saved STAR stories on this device.'));
 for(const st of current.stories.slice(-8))root.append(el('details',{},
  el('summary',{},st.title||'Untitled story'),
  el('pre',{class:'lw-help',style:'white-space:pre-wrap;overflow-wrap:anywhere'},assembleSTARAnswer(st))));

 root.append(el('h3',{},'Practice answer and immediate feedback'));
 const answer=area('',7,8000);
 const feedbackView=el('div',{'aria-live':'polite'});
 const storyForReview=()=>storyValue();
 const renderFeedback=feedback=>{
  feedbackView.replaceChildren(
   para('Local rules only: '+feedback.wordCount+' words; roughly '+feedback.estimatedSeconds+' seconds when spoken. This is not a performance or hiring score.'),
   list(feedback.notes,n=>finding(n.kind+': '+n.message,n.kind==='factual-review')),
   ...feedback.flaggedClaims.map(flag=>para('Check this claim: '+flag.message)),
   para(feedback.disclaimer));
 };
 root.append(labeled('Your answer to the selected question',answer),
  buttonGroup(
   button('Use my STAR structure',async()=>{answer.value=assembleSTARAnswer(storyForReview());notice('Inserted your own STAR notes only; fill missing details with true facts.');}),
   button('Check my answer',async()=>{renderFeedback(coachInterviewAnswer({answer:answer.value,question:selectedQuestion(),story:storyForReview(),job,document}));notice('Local answer feedback generated; no data sent.');}),
   button('Save answer and coaching review',async()=>{
    const q=selectedQuestion(),feedback=coachInterviewAnswer({answer:answer.value,question:q,story:storyForReview(),job,document});
    await saveSession(saveCoachingReview(current,{questionId:q.id,questionText:q.text,answer:answer.value,feedback,expectedRevision:current.revision}),'Answer review');
   },true)));
 if(current.reviews?.length)root.append(para(current.reviews.length+' saved practice answer reviews.'));
 const open=current.practice.find(p=>p.endedAt===undefined);
 const scoreBox=el('div');
 const score=(label)=>{
  const select=el('select',{'aria-label':label+' self-rating'},[1,2,3,4,5].map(n=>option(String(n),String(n))));
  select.value='3';scoreBox.append(labeled(label+' (1–5, self-assessed)',select));return select;
 };
 const scores={
  structure:score('Structure'),evidence:score('Evidence'),
  clarity:score('Clarity'),concision:score('Concision')
 };
 const timerNotes=area('',2,3000);
 root.append(el('h3',{},'Timed practice'));
 if(open)root.append(para('A practice session is open: '+open.questionText),
  scoreBox,labeled('Reflection notes',timerNotes),
  button('Finish timed practice',async()=>{
   const values=Object.fromEntries(Object.entries(scores).map(([k,node])=>[k,Number(node.value)]));
   await saveSession(finishPractice(current,open.id,{scores:values,notes:timerNotes.value,expectedRevision:current.revision}),'Timed practice');
  },true));
 else root.append(para('Start a 120-second practice. The timer is based on saved start and finish timestamps; scores are your own assessment.'),
  button('Start timed practice',async()=>{
   const q=selectedQuestion();
   await saveSession(startPractice(current,{questionId:q.id,questionText:q.text,limitSeconds:120,expectedRevision:current.revision}),'Timed practice started');
  }));
 root.append(el('h3',{},'Optional AI-assisted improvement — review first'));
 root.append(para('No AI service is connected. You may download a prompt, personally choose an external AI tool, then paste its suggestion here. The prompt contains private career information; do not share it unless you approve.'));
 const aiDraft=area('',5,8000),aiResults=el('div',{'aria-live':'polite'});
 let checkedText=null;
 root.append(button('Download optional AI feedback prompt (.txt)',async()=>{
  const text=prepareOptionalAIPrompt({job,question:selectedQuestion(),answer:answer.value,story:storyForReview(),document});
  download(text,'interview-ai-review-prompt.txt','text/plain;charset=utf-8');
  notice('Prompt downloaded locally. Ledger did not send it to any AI service.');
 }),labeled('Paste an AI-suggested rewrite for factual review',aiDraft),
  buttonGroup(
   button('Check suggested rewrite',async()=>{
    const result=reviewAIDraft({draft:aiDraft.value,originalAnswer:answer.value,story:storyForReview(),document,job});
    checkedText=aiDraft.value;
    aiResults.replaceChildren(para(result.notice),
     result.flaggedClaims.length?list(result.flaggedClaims,f=>finding(f.message,true))
      :para('No automatically detectable new numeric, named or credential claims. That does NOT establish truth.'));
    notice('Suggestion checked. Review all claims yourself before using it.');
   }),
   button('Use reviewed suggestion in answer',async()=>{
    if(!checkedText||checkedText!==aiDraft.value)throw Error('Check the current rewrite first');
    if(!confirm('Have you checked every statement for truth? This only replaces the unsaved answer text; it does not update your CV.'))return;
    answer.value=aiDraft.value;checkedText=null;notice('Suggestion inserted for your review. Save the answer separately.');
   })),aiResults);

 root.append(el('h3',{},'Company and role research brief'));
 root.append(para('Add source material that you personally opened and reviewed. Ledger cannot verify websites while offline, and never invents company facts. Source claims remain labelled as user-reviewed.'));
 const research={
  title:input('',200),url:input('',2048),excerpt:area('',4,1400),
  insight:area('',3,600)
 };
 const type=el('select',{'aria-label':'Research source category'},[
  option('company-official','Official company website'),
  option('job-advert','Original job posting'),
  option('independent','Independent publication'),
  option('other','Other public source')]);
 const confirmed=el('input',{type:'checkbox','aria-label':'I opened and reviewed this source'});
 root.append(
  labeled('Source category',type),
  labeled('Source title',research.title),
  labeled('Public HTTPS source link',research.url),
  labeled('Exact relevant excerpt (from source)',research.excerpt),
  labeled('What I learned or want to ask (your own words)',research.insight),
  el('label',{class:'lw-field'},confirmed,' I opened and personally checked this source and its excerpt.'),
  button('Add reviewed research source',async()=>{
   const saved=addReviewedResearchSource(current,{title:research.title.value,url:research.url.value,excerpt:research.excerpt.value,
    insight:research.insight.value,sourceType:type.value,userReviewed:confirmed.checked,expectedRevision:current.revision});
   await saveSession(saved,'Research source');
  },true),
  el('h4',{},'Brief: '+brief.role+' at '+brief.employer),
  para('Role requirements come from your pasted vacancy, not from live company research.'),
  list(brief.requirements.slice(0,10),r=>finding('['+r.priority+'] '+r.text)),
  ...brief.facts.map(f=>{
   let safeUrl;try{safeUrl=safeResearchUrl(f.url)}catch{safeUrl=null}
   return el('div',{class:'lw-field'},
    el('strong',{},f.citation+' '+f.title+' — reviewed by you'),
    safeUrl?el('a',{href:safeUrl,target:'_blank',rel:'noopener noreferrer'},'View source'):para('Source URL not valid'),
    para('Excerpt: '+f.text),f.insight?para('Your note: '+f.insight):null);
  }),
  para(brief.limitation));

 root.append(el('h3',{},'Export your interview workbook'));
 root.append(para('Includes the job requirements, labelled questions, your STAR stories, saved answer feedback, reviewed research excerpts, citations and reflection checklist. PDF/Word file fidelity and non-Latin text still require checking in the target viewer.'));
 root.append(buttonGroup(...['pdf','docx'].map(format=>button('Download interview workbook '+format.toUpperCase(),async()=>{
  const candidate=[document.personalInfo?.firstName,document.personalInfo?.lastName].filter(Boolean).join(' ');
  const file=exportInterviewWorkbook({session:current,questions:plan,job,candidateName:candidate,appearance:cv.appearance},format);
  download(file.bytes,'interview-workbook.'+format,file.mime);
  notice('Workbook '+format.toUpperCase()+' downloaded; check the rendered file. '+(file.warnings?.length?file.warnings.length+' export warnings were reported.':''));
 }))));
 return section('5. Advanced interview preparation and coaching',root);
}

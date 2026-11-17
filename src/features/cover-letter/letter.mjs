/**
 * Group D Stage 13: structured cover letters (Group A `CoverLetterDocument`).
 * Letters are independent revisioned documents linked to a job and CV variant only by id.
 * Facts are drawn from the CV variant and the JobTarget; anything else is flagged, never silently asserted.
 */
import {contractError,isSafeId,cloneData} from '../../contracts/platform.mjs';
import {detectUnsupportedClaims} from '../intelligence/claims.mjs';
import {plainText} from '../intelligence/text.mjs';
import {renderBlocksArtifact} from '../export/block-export.mjs';
const s=v=>typeof v==='string'?v.trim():'';
const idDefault=()=>'letter'+globalThis.crypto.randomUUID().replace(/-/g,'');
const SIGNOFFS=['Yours sincerely,','Yours faithfully,','Kind regards,','Best regards,','Sincerely,'];
export const LETTER_LAYOUTS=Object.freeze({
 classic:{template:'classic-serif',header:'centered'},modern:{template:'modern',header:'left'},
 compact:{template:'ats-compact',header:'left'},executive:{template:'executive',header:'centered'}});
export const MAX_FIELD=4000;
function assertText(label,v,max=MAX_FIELD){if(typeof v!=='string'||v.length>max)throw contractError('INVALID','Invalid '+label);return v;}
/** structure: {recipientName,employer,role,date,greeting,opening,body:[paragraph],closing,signoff,senderName} */
function structureToContent(st){
 const parts=[s(st.date),'',s(st.recipientName),s(st.employer),'',s(st.greeting),'',s(st.opening),...(st.body||[]).flatMap(p=>['',s(p)]),'',s(st.closing),'',s(st.signoff),s(st.senderName)];
 return parts.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
export function createLetterDraft({variant,job,now=new Date().toISOString(),idFactory=idDefault,layout='classic',date}={}){
 if(!variant?.document)throw contractError('INVALID','CV variant required');
 const p=variant.document.personalInfo||{},name=[p.firstName,p.lastName].map(s).filter(Boolean).join(' ');
 const role=s(job?.role),employer=s(job?.employer);
 const structure={recipientName:'Hiring Manager',employer,role,date:date||now.slice(0,10),
  greeting:'Dear Hiring Manager,',
  opening:role?'I am writing to apply for the '+role+' position'+(employer?' at '+employer:'')+'.':'I am writing to apply for the position.',
  body:[],closing:'Thank you for considering my application. I would welcome the opportunity to discuss it further.',
  signoff:'Yours sincerely,',senderName:name};
 const letter={id:checkId(idFactory()),revision:0,jobTargetId:job?.id&&isSafeId(job.id)?job.id:undefined,cvVariantId:variant.id,cvRevisionAtDraft:variant.revision,
  structure,content:structureToContent(structure),appearance:{layout},createdAt:now,updatedAt:now};
 if(letter.jobTargetId===undefined)delete letter.jobTargetId;
 return letter;
}
const checkId=id=>{if(!isSafeId(id))throw contractError('INVALID','Invalid letter id');return id;};
const FIELDS=['recipientName','employer','role','date','greeting','opening','closing','signoff','senderName'];
/** Immutable edit with optimistic revision check. Body is an array of paragraphs. */
export function reviseLetter(letter,patch,{expectedRevision,now=new Date().toISOString()}={}){
 if(letter.revision!==expectedRevision)throw contractError('CONFLICT','Letter changed since you opened it. Reload before editing.');
 const st=cloneData(letter.structure);
 for(const [k,v] of Object.entries(patch||{})){
  if(k==='body'){if(!Array.isArray(v)||v.length>12)throw contractError('INVALID','Body must be up to 12 paragraphs');st.body=v.map(x=>assertText('paragraph',x));}
  else if(FIELDS.includes(k))st[k]=assertText(k,v,k==='opening'||k==='closing'?MAX_FIELD:300);
  else throw contractError('INVALID','Unknown field '+k);
 }
 if(st.signoff&&!SIGNOFFS.includes(st.signoff)&&st.signoff.length>60)throw contractError('INVALID','Invalid sign-off');
 return {...letter,structure:st,content:structureToContent(st),revision:letter.revision+1,updatedAt:now};
}
export function setLetterLayout(letter,layout,{expectedRevision,now}={}){
 if(!LETTER_LAYOUTS[layout])throw contractError('INVALID','Unknown layout');
 if(letter.revision!==expectedRevision)throw contractError('CONFLICT','Letter changed since you opened it.');
 return {...letter,appearance:{...letter.appearance,layout},revision:letter.revision+1,updatedAt:now||new Date().toISOString()};
}
/** Factual check against the CV variant and the job. Returns findings; never rewrites. */
export function checkLetterFacts(letter,{variant,job}){
 const out=[],st=letter.structure;
 const source=plainText(variant.document)+'\n'+s(job?.role)+'\n'+s(job?.employer)+'\n'+s(job?.originalText);
 const own=[st.opening,...st.body,st.closing].filter(Boolean).join(' ');
 for(const i of detectUnsupportedClaims(own,source))out.push({severity:'error',kind:'unsupported-fact',message:i.message+' Remove it or confirm it is true.',text:i.text});
 if(job?.employer&&s(st.employer)&&s(st.employer).toLowerCase()!==s(job.employer).toLowerCase())out.push({severity:'error',kind:'employer-mismatch',message:'Letter employer "'+st.employer+'" differs from the job target "'+job.employer+'".'});
 if(job?.role&&s(st.role)&&s(st.role).toLowerCase()!==s(job.role).toLowerCase())out.push({severity:'error',kind:'role-mismatch',message:'Letter role "'+st.role+'" differs from the job target "'+job.role+'".'});
 const p=variant.document.personalInfo||{},cvName=[p.firstName,p.lastName].map(s).filter(Boolean).join(' ');
 if(cvName&&s(st.senderName)!==cvName)out.push({severity:'warning',kind:'name-mismatch',message:'Sender name differs from the CV name.'});
 if(!st.body.some(x=>s(x)))out.push({severity:'warning',kind:'empty-body',message:'The letter has no body paragraphs.'});
 if(/\[[^\]]+\]|lorem ipsum|insert .* here/i.test(letter.content))out.push({severity:'error',kind:'placeholder',message:'Placeholder text remains in the letter.'});
 if(letter.cvVariantId&&variant.id!==letter.cvVariantId)out.push({severity:'error',kind:'wrong-variant',message:'This letter belongs to a different CV variant.'});
 if(letter.cvRevisionAtDraft!==undefined&&variant.revision>letter.cvRevisionAtDraft)out.push({severity:'info',kind:'cv-changed',message:'The CV changed after this letter was drafted; re-check the facts.'});
 return out;
}
/** Letter + matching CV branding: reuses the CV's template/colour/paper so both documents look related. */
export function letterToBlocks(letter){
 const st=letter.structure,blocks=[];
 const line=(text)=>blocks.push({kind:'line',text:text||''});
 if(st.senderName)blocks.push({kind:'name',text:st.senderName});
 blocks.push({kind:'line',text:''});
 line(st.date);line('');line(st.recipientName);if(st.employer)line(st.employer);line('');
 line(st.greeting);line('');line(st.opening);
 for(const p of st.body){line('');line(p);}
 line('');line(st.closing);line('');line(st.signoff);line(st.senderName);
 return blocks;
}
export function exportLetter(letter,{cvAppearance={}}={},format='pdf'){
 const layout=LETTER_LAYOUTS[letter.appearance?.layout]||LETTER_LAYOUTS.classic;
 const appearance={...layout,...pick(cvAppearance,['color','paper','font','fontSize','margins']),spacing:'standard'};
 return renderBlocksArtifact({blocks:letterToBlocks(letter),appearance,title:(letter.structure.senderName||'Cover letter')+' - cover letter',sourceId:letter.id,sourceRevision:letter.revision},format);
}
const pick=(o,ks)=>Object.fromEntries(ks.filter(k=>o&&o[k]!==undefined).map(k=>[k,o[k]]));

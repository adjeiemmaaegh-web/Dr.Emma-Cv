/**
 * Group C Stage 10: requirement-to-evidence comparison. Every finding cites the original requirement and either
 * specific candidate text or an explicit "no evidence found" statement. There is no pass probability.
 */
import {documentUnits,stems,tokens,isStop} from '../intelligence/text.mjs';
const SYN={js:'javascript',ts:'typescript',ml:'machine learning',pm:'project management',crm:'customer relationship management',qa:'quality assurance',hr:'human resources',kpi:'key performance indicators'};
const expand=t=>SYN[t]?[t,...SYN[t].split(' ')]:[t];
export function requirementTerms(text){
 return [...new Set(tokens(text).filter(t=>t.length>2&&!isStop(t)&&!/^\d+$/.test(t)).flatMap(expand))];
}
const GENERIC=new Set('experience skills ability knowledge strong good excellent proven demonstrated understanding years year degree level required preferred working team teams role responsibilities'.split(' '));
export function compareToDocument(job,document){
 const units=documentUnits(document).map(u=>({...u,stems:new Set(stems(u.text))}));
 const results=job.requirements.map(r=>{
  const terms=requirementTerms(r.text).filter(t=>!GENERIC.has(t));
  const ts=terms.map(t=>({t,st:stems(t)[0]})).filter(x=>x.st);
  if(!ts.length)return {requirementId:r.id,requirement:r.text,priority:r.priority,status:'not-assessable',coverage:0,citations:[],
   note:'No distinctive terms to match. Read this requirement yourself.'};
  const cites=[];const hit=new Set();
  for(const u of units){const m=ts.filter(x=>u.stems.has(x.st));if(m.length){m.forEach(x=>hit.add(x.t));cites.push({path:u.path,excerpt:u.text.slice(0,200),matched:m.map(x=>x.t)});}}
  const coverage=hit.size/ts.length;
  const status=coverage>=0.6?'evidenced':coverage>0?'partial':'no-evidence';
  return {requirementId:r.id,requirement:r.text,priority:r.priority,status,coverage:Math.round(coverage*100)/100,
   citations:cites.sort((a,b)=>b.matched.length-a.matched.length).slice(0,4),
   note:status==='no-evidence'?'No supporting text found in your CV. This does not mean you lack it; add it only if it is true and you can evidence it.'
    :status==='partial'?'Only some terms are supported: '+[...hit].join(', ')+'.':''};
 });
 const by=s=>results.filter(r=>r.status===s).length;
 return {results,summary:{evidenced:by('evidenced'),partial:by('partial'),noEvidence:by('no-evidence'),notAssessable:by('not-assessable'),total:results.length},
  disclaimer:'Text overlap between a job post and your CV. It is not a prediction of selection or ATS outcome.'};
}

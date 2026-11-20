/** Evidence-led, offline-only CV suggestion ranking.
 * These are recommendations based on what someone entered, NOT claims that
 * any experience, certification or achievement has been independently verified.
 * Never read contact details, employer names, dates, private notes or uploads.
 */
const normal=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
const unique=values=>[...new Map(values.filter(Boolean).map(v=>[normal(v),v])).values()];
const textValue=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').slice(0,12000);
const safeDocument=doc=>doc&&typeof doc==='object'?doc:{};
const tokens=value=>new Set(normal(value).split(' ').filter(t=>t.length>=4&&![
 'with','from','that','this','their','they','have','work','working','skills','customer',
 'professional','reliable','focused','candidate','quality','standards','following',
 'using','tasks','team','clear','careful','maintained','prepared','checked',
 'recorded','reported','supported','following'
].includes(t)));

/** Match a named competence only to explicitly entered skills, or to an
 * exact phrase found in the user's own work-description text. Single vague
 * words in work descriptions never count as evidence.
 */
export function listedCompetencies({catalogSkills=[],document}={}){
 const doc=safeDocument(document);
 const names=Array.isArray(doc.skills)?doc.skills.map(s=>typeof s==='string'?s:s?.name)
  .filter(s=>typeof s==='string'&&s.length<=100):[];
 const entered=new Set(names.map(normal).filter(Boolean));
 const history=Array.isArray(doc.experience)?doc.experience.slice(0,50)
  .map(row=>textValue(row?.description)).join(' ').slice(0,40000):'';
 const fullHistory=' '+normal(history)+' ';
 return unique(catalogSkills.filter(skill=>{
  const key=normal(skill);
  if(!key||key.length>100)return false;
  if(entered.has(key))return true;
  // Descriptions are not proof, but a literal multiword match is traceable.
  return key.includes(' ')&&key.length>=9&&fullHistory.includes(' '+key+' ');
 })).slice(0,12);
}
export function evidenceSummary({role='',document,matchedSkills=[]}={}){
 const roleTitle=String(role||'').trim();
 const normalized=normal(roleTitle);
 if(!normalized||roleTitle.length>80||!matchedSkills.length||matchedSkills.length<2)return null;
 // Use only strings in the public occupation library, not arbitrary sensitive
 // values copied from fields. No fabricated outcomes, seniority or credentials.
 const skills=matchedSkills.slice(0,3);
 const focus=skills.length===2?skills.join(' and '):
  skills.slice(0,-1).join(', ')+', and '+skills.at(-1);
 const priorRole=Array.isArray(document?.experience)&&document.experience.some(
  row=>normal(row?.title)===normalized);
 const opening=priorRole?'Background in '+roleTitle+' work':'Interested in '+roleTitle+' opportunities';
 const result=opening+', with '+skills.length+' relevant skills listed in this CV: '+focus+
  '. Looking to apply these strengths in a role with clear responsibilities and opportunities to develop.';
 return result.length<=800?result:null;
}
/** Stable sort: only explicit, relevant competency vocabulary influences the
 * order; a zero-evidence CV retains the authored library order.
 */
export function prioritizeByEvidence(items,matchedSkills=[]){
 if(!matchedSkills?.length)return [...items];
 const termSets=matchedSkills.map(tokens).filter(set=>set.size);
 const scored=items.map((text,index)=>{
  const wordSet=tokens(text);
  const score=termSets.reduce((sum,need)=>sum+([...need].every(t=>wordSet.has(t))?1:0),0);
  return {text,index,score};
 });
 scored.sort((a,b)=>b.score-a.score||a.index-b.index);
 return scored.map(entry=>entry.text);
}
export function evidenceMetadata({role='',document,catalogSkills=[]}={}){
 const matchedSkills=listedCompetencies({document,catalogSkills});
 return Object.freeze({
  matchedSkills:Object.freeze(matchedSkills),
  summary:evidenceSummary({role,document,matchedSkills}),
  // Helpful for wording only. Exact work-history title is not proof of experience.
  hasListedRole:Array.isArray(document?.experience)&&document.experience.some(row=>normal(row?.title)===normal(role))
 });
}

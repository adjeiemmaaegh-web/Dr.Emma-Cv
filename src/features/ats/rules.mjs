/**
 * Group C Stage 9: explainable, local ATS/document diagnostics.
 * Each rule has a stable id, severity, explanation, a false-positive policy and a fixture reference (tests/intelligence).
 * There is NO overall "ATS pass probability": a diagnostic cannot predict a proprietary ATS.
 * ctx = { document, appearance, artifact?:{text,pageCount,format,warnings}, now?:Date }
 */
import {descriptionLines,parseDate,monthIndex,plainText} from '../intelligence/text.mjs';
const s=v=>typeof v==='string'?v.trim():'';
const F=(ruleId,severity,message,extra={})=>({ruleId,severity,message,...extra});
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ACTION=new Set('achieved administered analysed analyzed built coordinated created delivered designed developed directed established improved implemented increased introduced launched led maintained managed negotiated organised organized planned reduced resolved supervised trained managed streamlined opened closed supported oversaw ensured processed prepared reviewed handled completed produced operated installed repaired maintained taught advised audited cut grew generated drove owned'.split(' '));
const STANDARD_HEADINGS=new Set(['summary','profile','experience','work experience','employment','education','skills','certifications','languages','projects','achievements','interests','references','professional experience']);
const rules=[];
const rule=(id,title,severity,explanation,falsePositive,fixture,run)=>rules.push(Object.freeze({id,title,severity,explanation,falsePositive,fixture,run}));
const exps=d=>Array.isArray(d.experience)?d.experience:[];

rule('contact.name','Name present','error','Parsers and recruiters identify a CV by the name at the top.','None: an empty name is always a defect.','missing-name',
 c=>!s(c.document.personalInfo.firstName)&&!s(c.document.personalInfo.lastName)?[F('contact.name','error','No name is set.',{path:'personalInfo.firstName'})]:[]);
rule('contact.email','Valid email address','error','Employers need a reachable email; malformed addresses are dropped by parsers.','Uncommon but valid addresses may be flagged; the check is a syntax test only.','bad-email',
 c=>{const e=s(c.document.personalInfo.email);return !e?[F('contact.email','error','No email address.',{path:'personalInfo.email'})]:EMAIL.test(e)?[]:[F('contact.email','error','Email address looks malformed: '+e,{path:'personalInfo.email'})];});
rule('contact.phone','Phone number','warning','A phone number is expected by many employers.','Some regions and applicants intentionally omit it; severity is a warning.','missing-phone',
 c=>{const p=s(c.document.personalInfo.phone);return !p?[F('contact.phone','warning','No phone number.',{path:'personalInfo.phone'})]:p.replace(/\D/g,'').length<7?[F('contact.phone','warning','Phone number has fewer than 7 digits.',{path:'personalInfo.phone'})]:[];});
rule('contact.location','Location','info','Location helps match local and hybrid roles.','Remote-only applicants may omit it.','missing-location',
 c=>!s(c.document.personalInfo.city)?[F('contact.location','info','No city/location.',{path:'personalInfo.city'})]:[]);
rule('contact.title','Professional title','info','A headline title tells a reader and a parser what role you target.','Career changers may prefer a summary instead.','missing-title',
 c=>!s(c.document.personalInfo.title)?[F('contact.title','info','No professional title under your name.',{path:'personalInfo.title'})]:[]);
rule('contact.photo','Photo in a CV','info','Photos can add nothing for parsers and some regions discourage them.','Photos are customary in some countries; this is informational only.','photo-on',
 c=>c.appearance&&c.appearance.photo===true?[F('contact.photo','info','A photo is enabled. Some markets and employers prefer CVs without one.')]:[]);
rule('summary.present','Summary present','info','A short summary gives parsers and readers context.','Experienced applicants with strong experience sections may reasonably skip it.','no-summary',
 c=>!s(c.document.summary)?[F('summary.present','info','No summary section.',{path:'summary'})]:[]);
rule('summary.length','Summary length','warning','Summaries beyond ~120 words are rarely read.','A long but dense summary is flagged anyway; it is a readability heuristic.','long-summary',
 c=>{const n=s(c.document.summary).split(/\s+/).filter(Boolean).length;return n>120?[F('summary.length','warning','Summary is '+n+' words (suggested maximum ~120).',{path:'summary'})]:[];});
rule('experience.present','Work experience present','warning','Most employers expect experience; graduates may rely on education/projects.','Early-career applicants legitimately have none; only a warning.','no-experience',
 c=>!exps(c.document).length?[F('experience.present','warning','No work experience entries.',{path:'experience'})]:[]);
rule('experience.fields','Role title, employer and dates complete','error','Parsers associate bullets with a role using title, employer and dates.','Volunteering or informal roles may lack an employer; prefer a descriptive label.','incomplete-role',
 c=>exps(c.document).flatMap((e,i)=>{const out=[];const at=`experience[${e.id??i}]`;
  if(!s(e.title))out.push(F('experience.fields','error','Role '+(i+1)+' has no job title.',{path:at+'.title'}));
  if(!s(e.employer))out.push(F('experience.fields','warning','Role '+(i+1)+' has no employer.',{path:at+'.employer'}));
  if(!s(e.start))out.push(F('experience.fields','error','Role '+(i+1)+' has no start date.',{path:at+'.start'}));
  if(!s(e.end)&&!e.current&&s(e.start))out.push(F('experience.fields','warning','Role '+(i+1)+' has no end date and is not marked current.',{path:at+'.end'}));
  return out;}));
rule('dates.valid','Dates readable and not in the future','error','Unparseable or future-dated roles confuse chronology checks.','Planned future study may legitimately end in the future; only experience roles are checked.','bad-dates',
 c=>{const now=c.now||new Date(),out=[];
  exps(c.document).forEach((e,i)=>{for(const k of ['start','end']){const v=s(e[k]);if(!v)continue;const d=parseDate(v);const at=`experience[${e.id??i}].${k}`;
   if(!d)out.push(F('dates.valid','warning','Role '+(i+1)+' '+k+' date "'+v+'" is not in a standard format (e.g. "Jan 2020" or "2020").',{path:at}));
   else if(d!=='present'&&k==='start'&&monthIndex(d,now)>now.getFullYear()*12+now.getMonth())out.push(F('dates.valid','error','Role '+(i+1)+' starts in the future.',{path:at}));}});
  return out;});
rule('dates.format','Consistent date format','info','Mixed date styles are harder for parsers and readers to compare.','Intentional mixes (year-only for old roles) are still flagged as informational.','mixed-dates',
 c=>{const kinds=new Set();for(const e of exps(c.document))for(const k of ['start','end']){const v=s(e[k]);if(!v)continue;const d=parseDate(v);if(d&&d!=='present')kinds.add(d.m?(/\d+[\/.-]\d{4}/.test(v)?'numeric':'month-year'):'year');}
  return kinds.size>1?[F('dates.format','info','Dates use mixed formats ('+[...kinds].join(', ')+'). Pick one style.')]:[];});
rule('chronology.order','Reverse-chronological order','warning','Recruiters and parsers expect the most recent role first.','Deliberate functional layouts are flagged; reorder or ignore.','wrong-order',
 c=>{const items=exps(c.document).map((e,i)=>({e,i,d:parseDate(s(e.start))})).filter(x=>x.d&&x.d!=='present');const out=[];
  for(let k=1;k<items.length;k++)if(monthIndex(items[k].d)>monthIndex(items[k-1].d))out.push(F('chronology.order','warning','Role '+(items[k].i+1)+' started after the role listed above it; most recent should come first.',{path:`experience[${items[k].e.id??items[k].i}]`}));
  return out;});
rule('chronology.gaps','Unexplained gaps','info','Gaps over 12 months may prompt questions.','Gaps for study, caring or travel are normal; this only informs, it does not judge.','gap',
 c=>{const r=exps(c.document).map(e=>({a:parseDate(s(e.start)),b:e.current?'present':parseDate(s(e.end))})).filter(x=>x.a&&x.a!=='present'&&x.b).sort((x,y)=>monthIndex(x.a)-monthIndex(y.a));const out=[];
  for(let k=1;k<r.length;k++){const gap=monthIndex(r[k].a,c.now)-monthIndex(r[k-1].b,c.now);if(gap>12)out.push(F('chronology.gaps','info','About '+gap+' months between two roles.'));}
  return out;});
rule('bullets.count','Achievements per role','warning','Roles without detail give nothing to match against a job.','Very short roles may legitimately have little detail.','no-bullets',
 c=>exps(c.document).flatMap((e,i)=>{const n=descriptionLines(e.description).length;const at=`experience[${e.id??i}].description`;
  return n===0?[F('bullets.count','warning','Role '+(i+1)+' ('+s(e.title)+') has no description.',{path:at})]:n>8?[F('bullets.count','info','Role '+(i+1)+' has '+n+' lines; consider keeping the strongest 4-6.',{path:at})]:[];}));
rule('bullets.length','Bullet length','info','Very long bullets are hard to scan; very short ones carry little information.','Dense technical bullets may be long on purpose.','long-bullet',
 c=>exps(c.document).flatMap((e,i)=>descriptionLines(e.description).flatMap((l,j)=>{const n=l.text.split(/\s+/).length;const at=`experience[${e.id??i}].description[${j}]`;
  return n>40?[F('bullets.length','info','A bullet is '+n+' words long.',{path:at})]:n<4?[F('bullets.length','info','A bullet is only '+n+' words.',{path:at})]:[];})));
rule('bullets.verbs','Bullets start with an action','info','Action-led bullets state what you did.','The verb list is finite: unusual but strong verbs are flagged as false positives. Review manually.','weak-verbs',
 c=>exps(c.document).flatMap((e,i)=>descriptionLines(e.description).filter(l=>l.bullet).flatMap((l,j)=>{const w=l.text.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g,'');
  return w&&!ACTION.has(w)&&!/(ed|ised|ized)$/.test(w)?[F('bullets.verbs','info','Bullet starts with "'+w+'" rather than an action verb.',{path:`experience[${e.id??i}].description[${j}]`})]:[];})));
rule('bullets.pronouns','First-person pronouns','info','CVs conventionally omit "I/my".','Quoted testimonials are flagged.','pronouns',
 c=>{const t=plainText(c.document);return /\b(i|my|me)\b/i.test(t)?[F('bullets.pronouns','info','First-person pronouns ("I", "my") found.')]:[];});
rule('bullets.numbers','Quantified results','info','Concrete numbers (only where true) make impact checkable.','Many valid roles have no honest figure; never add one that is not real.','no-numbers',
 c=>{const lines=exps(c.document).flatMap(e=>descriptionLines(e.description));return lines.length>=3&&!lines.some(l=>/\d/.test(l.text))?[F('bullets.numbers','info','No numbers appear in your bullets. Add figures only where you can substantiate them.')]:[];});
rule('skills.present','Skills listed','warning','A skills list gives parsers explicit terms to match.','Trades with licences may list them under certifications.','no-skills',
 c=>!(c.document.skills||[]).some(x=>s(x.name))?[F('skills.present','warning','No skills listed.',{path:'skills'})]:[]);
rule('skills.count','Skills count','info','Long skill lists dilute signal.','Technical roles can need more.','many-skills',
 c=>(c.document.skills||[]).length>25?[F('skills.count','info','More than 25 skills listed; keep the most relevant.')]:[]);
rule('education.present','Education present','info','Most employers expect education or training.','Experience-led applicants may omit it.','no-education',
 c=>!(c.document.education||[]).length?[F('education.present','info','No education entries.',{path:'education'})]:[]);
rule('headings.standard','Standard section headings','warning','Parsers recognise common headings; unusual ones may be missed.','Creative headings are legitimate for human readers.','odd-heading',
 c=>(c.document.customSections||[]).filter(x=>s(x.title||x.name)&&!STANDARD_HEADINGS.has(s(x.title||x.name).toLowerCase())).map(x=>F('headings.standard','warning','Custom heading "'+s(x.title||x.name)+'" may not be recognised by parsers.')));
rule('layout.columns','Multi-column layout','warning','Some parsers read columns in the wrong order.','Our own export flattens to one column; only fires when the exported artifact says so.','sidebar-export',
 c=>(c.artifact?.warnings||[]).some(w=>/single column/i.test(w))?[F('layout.columns','warning','A multi-column template was exported as a single column; check the preview reads the way you intend.')]:[]);
rule('layout.pages','Page count','info','Most CVs fit 1-2 pages.','Academic and senior CVs are longer.','four-pages',
 c=>c.artifact&&c.artifact.pageCount>2?[F('layout.pages','info','The exported CV is '+c.artifact.pageCount+' pages.')]:[]);
rule('export.encoding','Characters preserved in export','warning','Characters replaced with "?" corrupt names and words.','Only fires when the renderer reports loss.','lossy-pdf',
 c=>(c.artifact?.warnings||[]).some(w=>/replaced with/i.test(w))?[F('export.encoding','warning','Some characters could not be encoded in this export format; use DOCX or adjust the text.')]:[]);
rule('export.text','Exported text contains your key facts','error','The exported file must contain the same name, email and employers a parser will read.','Only runs when an exported artifact is supplied.','missing-export-text',
 c=>{if(!c.artifact||typeof c.artifact.text!=='string')return [];const t=c.artifact.text.toLowerCase(),p=c.document.personalInfo,out=[];
  const must=[[s(p.email),'email'],...exps(c.document).map(e=>[s(e.employer),'employer "'+s(e.employer)+'"'])].filter(x=>x[0]);
  for(const [v,label] of must)if(!t.includes(v.toLowerCase()))out.push(F('export.text','error','The exported file text does not contain your '+label+'.'));
  return out;});
rule('export.order','Exported reading order matches your CV','error','If export order differs from the editor, parsers may associate dates with the wrong role.','Only runs with an exported artifact.','swapped-order',
 c=>{if(!c.artifact||typeof c.artifact.text!=='string')return [];const t=c.artifact.text,pos=exps(c.document).map(e=>s(e.employer)?t.indexOf(s(e.employer)):-1).filter(x=>x>=0);
  return pos.some((x,i)=>i&&x<pos[i-1])?[F('export.order','error','Employers appear in a different order in the exported file than in your CV.')]:[];});
rule('links.safe','Links are web or email only','warning','Other schemes cannot be followed and may be unsafe.','None.','unsafe-link',
 c=>['linkedin','website'].flatMap(k=>{const v=s(c.document.personalInfo[k]);return v&&/^[a-z][a-z0-9+.-]*:/i.test(v)&&!/^(https?|mailto):/i.test(v)?[F('links.safe','warning','The '+k+' link uses an unsupported scheme.',{path:'personalInfo.'+k})]:[];}));
rule('text.repetition','Repeated phrasing','info','Repeating the same opening word signals weak variety.','Parallel structure can be intentional.','repeated-start',
 c=>{const lines=exps(c.document).flatMap(e=>descriptionLines(e.description)),count={};for(const l of lines){const w=l.text.split(/\s+/)[0]?.toLowerCase();if(w)count[w]=(count[w]||0)+1;}
  return Object.entries(count).filter(([,n])=>n>=3).map(([w,n])=>F('text.repetition','info','"'+w+'" starts '+n+' bullets.'));});
export const RULES=Object.freeze(rules);

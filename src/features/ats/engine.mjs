import {RULES} from './rules.mjs';
const ORDER={error:0,warning:1,info:2};
/** Runs every rule. A throwing rule is reported, never silently skipped. No score or pass probability is produced. */
export function runAtsChecks(ctx,{rules=RULES,disabled=[],severityOverrides={}}={}){
 if(!ctx||!ctx.document)throw Object.assign(new Error('document required'),{code:'INVALID'});
 const findings=[],ran=[],failed=[];
 for(const r of rules){
  if(disabled.includes(r.id))continue;
  try{for(const f of r.run(ctx))findings.push({...f,severity:severityOverrides[r.id]||f.severity,title:r.title,explanation:r.explanation});ran.push(r.id);}
  catch(e){failed.push({ruleId:r.id,error:String(e&&e.message||e)});}
 }
 findings.sort((a,b)=>ORDER[a.severity]-ORDER[b.severity]);
 const counts={error:0,warning:0,info:0};for(const f of findings)counts[f.severity]++;
 return {findings,counts,rulesRun:ran.length,rulesFailed:failed,usedExportedArtifact:!!ctx.artifact,
  disclaimer:'Local diagnostics only. This is not a score, and it cannot predict how any employer\'s applicant tracking system will treat your CV.'};
}
export function coverageMatrix(rules=RULES){
 return rules.map(r=>({id:r.id,title:r.title,defaultSeverity:r.severity,fixture:r.fixture,hasFalsePositivePolicy:!!r.falsePositive,hasExplanation:!!r.explanation}));
}

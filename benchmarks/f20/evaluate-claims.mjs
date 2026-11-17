/** Only inventories declared local checks and unverified competitor mapping, never a 'winner'. */
import fs from 'node:fs';import path from 'node:path';
import {RULES} from '../../src/features/ats/rules.mjs';
const mapping=JSON.parse(fs.readFileSync(new URL('./enhancv-check-map.json',import.meta.url),'utf8'));
const counts=Object.fromEntries(['automated-local','partial','not-assessed'].map(k=>[k,mapping.criteria.filter(c=>c.assessment===k).length]));
const out={kind:'f20-comparative-claims-inventory',version:1,source:mapping.source,accessed:mapping.accessed,
 localRuleCount:RULES.length,publicCompetitorCategories:7,publicCompetitorChecklistItems:27,
 selfMappedLocalClaims:counts,headToHeadTestCount:0,humanReviewCount:0,
 competitiveWinner:'UNVERIFIED',unsupportedClaim:'A mapping to a local rule is not evidence of equivalent detection accuracy.',
 measuredOnly:{localRuleIds:RULES.map(r=>r.id)},
 evidenceLimitations:['No competitor account or identical document run','No controlled recruiter blind evaluation',
 'No third-party ATS parser sample','No actual customer/device release signoff']};
const dest=process.env.F20_REPORT_DIR;
if(dest){fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'comparison-inventory.json'),JSON.stringify(out,null,2)+'\n');}
console.log(JSON.stringify({localRules:out.localRuleCount,competitorItems:27,mapping:counts,
 headToHeadTests:0,winner:out.competitiveWinner},null,2));

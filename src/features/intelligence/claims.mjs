/**
 * Factual-integrity guard shared by tailoring, writing and AI suggestions.
 * A proposed text is "unsupported" if it introduces numbers or proper-noun-like terms absent from the source CV.
 * Conservative by design: it flags for human review, it never proves truth.
 */
const NUM=/(?:[$£€]\s?)?\d[\d,.]*\s?(?:%|k|m|bn|x)?/gi;
const norm=n=>n.toLowerCase().replace(/[\s,$£€]/g,'');
const CAP=/(?:^|[^.!?]\s)((?:[A-Z][\w&'-]+)(?:\s+[A-Z][\w&'-]+)*)/g;
export function detectUnsupportedClaims(after,sourceText){
 const src=String(sourceText||''),srcLower=src.toLowerCase(),srcNums=new Set((src.match(NUM)||[]).map(norm)),issues=[];
 for(const n of String(after).match(NUM)||[])if(!srcNums.has(norm(n))&&norm(n).length)issues.push({type:'number',text:n.trim(),message:'Number "'+n.trim()+'" is not in your CV.'});
 for(const m of String(after).matchAll(CAP)){const t=m[1];if(m[0]===t&&!/\s/.test(t))continue; /* single sentence-initial word is usually just a capitalised verb */ if(!srcLower.includes(t.toLowerCase())&&!/^(I|The|A|An)$/.test(t))issues.push({type:'name',text:t,message:'"'+t+'" does not appear in your CV.'});}
 const claimWords=/\b(award(?:ed)?|certified|licen[cs]ed|phd|master'?s|mba|bachelor'?s|degree|fluent|expert)\b/gi;
 for(const m of String(after).matchAll(claimWords))if(!srcLower.includes(m[1].toLowerCase()))issues.push({type:'credential',text:m[1],message:'Credential or level claim "'+m[1]+'" is not in your CV.'});
 return issues;
}
export const hasUnsupportedClaims=(after,source)=>detectUnsupportedClaims(after,source).length>0;

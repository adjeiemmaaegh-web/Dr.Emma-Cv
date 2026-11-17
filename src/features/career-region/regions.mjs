/**
 * Group D Stage 16: region guidance and multilingual labels.
 * GENERAL guidance only ("commonly", "varies by employer"). Every entry is marked unreviewed by a local expert and by native
 * speakers; it must be reviewed before being presented as authoritative. It never blocks the user, only advises.
 */
const U='unreviewed-general-guidance';
const R=(id,name,o)=>Object.freeze({id,name,reviewStatus:U,docName:'CV',photo:'not-expected',avoid:[],pages:'1-2 pages',...o});
export const REGIONS=Object.freeze([
 R('us','United States',{docName:'resume',paper:'Letter',photo:'discouraged',avoid:['dateOfBirth','maritalStatus','nationality','idNumber'],pages:'1 page early career, 2 for senior roles',dates:'MM/YYYY or Mon YYYY',spelling:'US',references:'Usually not listed; "available on request" is optional',notes:'Employers often discourage photos and personal details to avoid discrimination concerns.'}),
 R('ca','Canada',{docName:'resume',paper:'Letter',photo:'discouraged',avoid:['dateOfBirth','maritalStatus','nationality','idNumber'],pages:'1-2 pages',dates:'Mon YYYY',spelling:'Canadian',references:'Provided on request',notes:'Quebec employers may expect French.'}),
 R('uk','United Kingdom',{paper:'A4',photo:'discouraged',avoid:['dateOfBirth','maritalStatus','nationality','idNumber'],pages:'2 pages is typical',dates:'Mon YYYY',spelling:'British',references:'Often "available on request"',notes:'Photos and date of birth are not expected.'}),
 R('ie','Ireland',{paper:'A4',photo:'discouraged',avoid:['dateOfBirth','maritalStatus','idNumber'],pages:'2 pages is typical',dates:'Mon YYYY',spelling:'British/Irish',references:'Often 2 referees or on request'}),
 R('au','Australia',{docName:'resume',paper:'A4',photo:'discouraged',avoid:['dateOfBirth','maritalStatus','idNumber'],pages:'2-3 pages',dates:'Mon YYYY',spelling:'Australian',references:'Referees are commonly listed'}),
 R('de','Germany',{docName:'Lebenslauf',paper:'A4',photo:'optional',avoid:['idNumber'],pages:'1-2 pages, tabular reverse-chronological',dates:'MM/YYYY',spelling:'German',references:'Employer references (Arbeitszeugnisse) are usually attached separately',notes:'A photo and some personal details were traditional but are optional today; many applicants omit them.'}),
 R('fr','France',{paper:'A4',photo:'optional',avoid:['idNumber'],pages:'1 page is common',dates:'MM/YYYY',spelling:'French',references:'Rarely listed',notes:'A photo is common but optional.'}),
 R('ae','United Arab Emirates',{paper:'A4',photo:'common',avoid:['idNumber'],pages:'2 pages',dates:'Mon YYYY',spelling:'British',references:'On request',notes:'Nationality and visa status are often stated; employers vary.'}),
 R('gh','Ghana',{paper:'A4',photo:'optional',avoid:['idNumber'],pages:'2 pages',dates:'Mon YYYY',spelling:'British',references:'Two or three referees are commonly listed',notes:'Older formats included date of birth and marital status; they are not required and can be omitted.'}),
 R('ng','Nigeria',{paper:'A4',photo:'optional',avoid:['idNumber'],pages:'2 pages',dates:'Mon YYYY',spelling:'British',references:'Referees are commonly listed',notes:'Personal details such as marital status are not required.'}),
 R('in','India',{docName:'resume',paper:'A4',photo:'optional',avoid:['idNumber'],pages:'1-2 pages',dates:'Mon YYYY',spelling:'British/Indian',references:'Usually on request',notes:'Some employers still expect personal details; they are optional.'}),
 R('za','South Africa',{paper:'A4',photo:'optional',avoid:['idNumber'],pages:'2-3 pages',dates:'Mon YYYY',spelling:'British',references:'Referees are commonly listed',notes:'Avoid publishing a national ID number.'})
]);
const BY=new Map(REGIONS.map(r=>[r.id,r]));
export const getRegion=id=>BY.get(id)||null;
const FIELD_LABEL={dateOfBirth:'date of birth',maritalStatus:'marital status',nationality:'nationality',idNumber:'ID number'};
/** Advice only; never edits. */
export function regionChecks(regionId,{document,appearance={}}){
 const r=getRegion(regionId);if(!r)throw Object.assign(new Error('Unknown region'),{code:'INVALID'});
 const out=[],p=document.personalInfo||{};
 const paper=appearance.paper||'A4';
 if(paper!==r.paper)out.push({kind:'paper',severity:'info',message:r.name+' normally uses '+r.paper+' paper; this CV is set to '+paper+'.'});
 if(appearance.photo===true&&(r.photo==='discouraged'||r.photo==='not-expected'))out.push({kind:'photo',severity:'warning',message:'Photos are '+(r.photo==='discouraged'?'usually discouraged':'not expected')+' in '+r.name+'.'});
 if(appearance.photo!==true&&r.photo==='common')out.push({kind:'photo',severity:'info',message:'A photo is common in '+r.name+' but optional.'});
 for(const f of r.avoid)if(s(p[f]))out.push({kind:'personal-detail',severity:'warning',message:'Consider removing your '+FIELD_LABEL[f]+'; it is not expected in '+r.name+'.',path:'personalInfo.'+f});
 out.push({kind:'guidance',severity:'info',message:'Typical length: '+r.pages+'. Dates: '+r.dates+'. Spelling: '+r.spelling+'.'});
 return {region:r.id,reviewStatus:r.reviewStatus,findings:out,disclaimer:'General guidance that varies by employer and industry; it has not been reviewed by a local recruitment expert.'};
}
const s=v=>typeof v==='string'?v.trim():'';
const L=(dir,summary,experience,education,skills,certifications,languages,projects,references)=>Object.freeze({dir,reviewStatus:'unreviewed-by-native-speaker',labels:Object.freeze({summary,experience,education,skills,certifications,languages,projects,references})});
export const LOCALES=Object.freeze({
 en:L('ltr','Summary','Experience','Education','Skills','Certifications','Languages','Projects','References'),
 fr:L('ltr','Profil','Expérience professionnelle','Formation','Compétences','Certifications','Langues','Projets','Références'),
 de:L('ltr','Profil','Berufserfahrung','Ausbildung','Kenntnisse','Zertifikate','Sprachen','Projekte','Referenzen'),
 es:L('ltr','Perfil','Experiencia profesional','Educación','Habilidades','Certificaciones','Idiomas','Proyectos','Referencias'),
 pt:L('ltr','Resumo','Experiência profissional','Formação','Competências','Certificações','Idiomas','Projetos','Referências'),
 ar:L('rtl','الملخص','الخبرة العملية','التعليم','المهارات','الشهادات','اللغات','المشاريع','المراجع')
});
/** Heading labels for a locale (falls back to English, reported). RTL needs a renderer that supports it. */
export function sectionLabels(locale){
 const l=LOCALES[locale];
 return l?{locale,fallback:false,dir:l.dir,labels:l.labels,reviewStatus:l.reviewStatus,
  rendererNote:l.dir==='rtl'||locale!=='en'?'Group B\'s PDF writer uses standard Latin fonts (WinAnsi): Arabic cannot be rendered in PDF yet. Use DOCX, which keeps Unicode; right-to-left layout is not implemented in the exporter.':''}
  :{locale,fallback:true,dir:'ltr',labels:LOCALES.en.labels,reviewStatus:LOCALES.en.reviewStatus,rendererNote:''};
}

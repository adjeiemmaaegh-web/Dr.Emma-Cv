/**
 * Group A Stage 3. Browser-independent, immutable career profile commands.
 * Never reads/writes legacy localStorage; legacy conversion is a reviewed proposal.
 */
import {cloneData,contractError,isSafeId,isPlainObject,LEDGER_EVIDENCE_SOURCES} from '../../contracts/platform.mjs';
import {validLegacyCVState,validLegacyDocument} from '../storage/legacy-shape.mjs';
const DOCUMENT_ARRAYS=Object.freeze(['experience','education','skills','languages','certifications','projects','accomplishments','customSections']);
const MAX_VARIANTS=40,MAX_EVIDENCE=500,MAX_SNAPSHOTS=12;
const text=(value,max)=>typeof value==='string'&&value.length<=max;
const nowDefault=()=>new Date().toISOString();
const idDefault=()=>{if(!globalThis.crypto?.randomUUID)throw contractError('UNAVAILABLE','Secure identifier generator unavailable');return 'ledger_'+globalThis.crypto.randomUUID().replace(/-/g,'');};
const checkId=id=>{if(!isSafeId(id))throw contractError('INVALID','Invalid identifier');return id;};
function iso(value){if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw contractError('INVALID','Invalid timestamp');return value;}
function object(value,label){if(!isPlainObject(value))throw contractError('INVALID','Invalid '+label);return value;}
function document(value){
 if(!validLegacyDocument(value))throw contractError('INVALID','Invalid CV document fields');
 return cloneData(value);
}
export function blankCareerDocument(){
 const value={personalInfo:{},summary:'',hobbies:'',references:''};
 for(const field of DOCUMENT_ARRAYS)value[field]=[];
 return value;
}
function variant({id,masterId,name,document:doc,appearance={},targetJobId,now}){
 const out={id:checkId(id),masterId:checkId(masterId),name,revision:0,
  document:document(doc),appearance:cloneData(object(appearance,'appearance')),
  createdAt:iso(now),updatedAt:iso(now),history:[]};
 if(!text(name,120)||!name.trim())throw contractError('INVALID','Invalid variant name');
 if(targetJobId!==undefined)out.targetJobId=checkId(targetJobId);
 return out;
}
export function createCareerProfile({id,displayName='My career profile',document:doc=blankCareerDocument(),
 appearance={},now=nowDefault(),idFactory=idDefault}={}){
 const profileId=checkId(id??idFactory());
 const masterId=checkId(idFactory());
 if(!text(displayName,120)||!displayName.trim())throw contractError('INVALID','Invalid profile name');
 const value={schemaVersion:1,id:profileId,revision:0,name:displayName,
  createdAt:iso(now),updatedAt:iso(now),
  master:variant({id:masterId,masterId,name:'Master CV',document:doc,appearance,now}),
  variants:[],evidence:[]};
 validateCareerProfile(value);
 return value;
}
export function validateCareerProfile(value){
 object(value,'profile');
 if(value.schemaVersion!==1||!isSafeId(value.id)||!Number.isSafeInteger(value.revision)||value.revision<0||
  !text(value.name,120)||!value.name.trim())throw contractError('INVALID','Invalid profile header');
 iso(value.createdAt);iso(value.updatedAt);
 const main=object(value.master,'master');
 if(!isSafeId(main.id)||main.masterId!==main.id)throw contractError('INVALID','Master identity mismatch');
 if(!Array.isArray(value.variants)||value.variants.length>MAX_VARIANTS)throw contractError('INVALID','Invalid variant collection');
 if(!Array.isArray(value.evidence)||value.evidence.length>MAX_EVIDENCE)throw contractError('INVALID','Invalid evidence collection');
 const ids=new Set();
 for(const entry of [main,...value.variants]){
  object(entry,'CV variant');
  if(!isSafeId(entry.id)||ids.has(entry.id)||entry.masterId!==main.id||
   !text(entry.name,120)||!entry.name.trim()||
   !Number.isSafeInteger(entry.revision)||entry.revision<0)throw contractError('INVALID','Invalid or duplicate variant');
  ids.add(entry.id);iso(entry.createdAt);iso(entry.updatedAt);
  document(entry.document);object(entry.appearance,'appearance');
  // Historical v1 backups without snapshots remain valid, while future edits
  // preserve up to twelve former CV documents (all included in backups).
  if(entry.history!==undefined){
   if(!Array.isArray(entry.history)||entry.history.length>MAX_SNAPSHOTS)
    throw contractError('INVALID','Invalid variant revision history');
   let last=-1;
   for(const snapshot of entry.history){
    object(snapshot,'variant snapshot');
    if(!Number.isSafeInteger(snapshot.revision)||snapshot.revision<=last||
       snapshot.revision>=entry.revision)
     throw contractError('INVALID','Invalid variant snapshot revision');
    document(snapshot.document);object(snapshot.appearance,'snapshot appearance');
    iso(snapshot.updatedAt);last=snapshot.revision;
   }
  }
  if(entry.targetJobId!==undefined&&!isSafeId(entry.targetJobId))throw contractError('INVALID','Invalid target job');
 }
 const evidenceIds=new Set();
 for(const item of value.evidence){
  object(item,'evidence');
  if(!isSafeId(item.id)||evidenceIds.has(item.id)||!text(item.claim,3000)||!item.claim.trim()||
   !LEDGER_EVIDENCE_SOURCES.includes(item.source)||typeof item.verifiedByUser!=='boolean'||
   item.verifiedByUser&&item.source!=='verified-by-user'||
   item.sourceRef!==undefined&&!text(item.sourceRef,1000)||
   item.path!==undefined&&!text(item.path,300))throw contractError('INVALID','Invalid or duplicate evidence');
  iso(item.capturedAt);evidenceIds.add(item.id);
 }
 return true;
}
function nextProfile(value,expectedRevision,now){
 validateCareerProfile(value);
 if(value.revision!==expectedRevision)throw contractError('CONFLICT','Profile revision changed. Reload before editing.');
 const copy=cloneData(value);
 copy.revision++;
 copy.updatedAt=iso(now);
 return copy;
}
export function addCareerEvidence(profile,claim,{id,source='user-asserted',sourceRef,path,verifiedByUser=false,expectedRevision,now=nowDefault(),idFactory=idDefault}={}){
 const copy=nextProfile(profile,expectedRevision,now);
 if(copy.evidence.length>=MAX_EVIDENCE)throw contractError('INVALID','Evidence limit reached');
 const item={id:checkId(id??idFactory()),source,claim,capturedAt:iso(now),verifiedByUser};
 if(sourceRef!==undefined)item.sourceRef=sourceRef;
 if(path!==undefined)item.path=path;
 copy.evidence.push(item);validateCareerProfile(copy);return copy;
}
export function createCVVariant(profile,{id,name='Tailored CV',targetJobId,expectedRevision,now=nowDefault(),idFactory=idDefault}={}){
 const copy=nextProfile(profile,expectedRevision,now);
 if(copy.variants.length>=MAX_VARIANTS)throw contractError('INVALID','Variant limit reached');
 const snapshot=variant({id:id??idFactory(),masterId:copy.master.id,name,document:copy.master.document,
  appearance:copy.master.appearance,targetJobId,now});
 copy.variants.push(snapshot);validateCareerProfile(copy);return copy;
}
function preserveVariantRevision(target){
 const snapshots=Array.isArray(target.history)?target.history:[];
 snapshots.push({revision:target.revision,document:cloneData(target.document),
  appearance:cloneData(target.appearance),updatedAt:target.updatedAt});
 target.history=snapshots.slice(-MAX_SNAPSHOTS);
}
export function updateCVVariant(profile,{variantId,document:doc,appearance,expectedRevision,now=nowDefault()}={}){
 const copy=nextProfile(profile,expectedRevision,now);
 if(variantId===copy.master.id)throw contractError('UNCONFIRMED','Master changes require an explicit master-edit command');
 const target=copy.variants.find(x=>x.id===variantId);
 if(!target)throw contractError('INVALID','Unknown variant');
 if(doc===undefined&&appearance===undefined)throw contractError('INVALID','No variant changes supplied');
 preserveVariantRevision(target);
 if(doc!==undefined)target.document=document(doc);
 if(appearance!==undefined)target.appearance=cloneData(object(appearance,'appearance'));
 target.revision++;target.updatedAt=iso(now);
 validateCareerProfile(copy);return copy;
}
export function replaceMasterDocument(profile,{document:doc,appearance,confirmed=false,expectedRevision,now=nowDefault()}={}){
 if(confirmed!==true)throw contractError('UNCONFIRMED','Master edits require explicit confirmation');
 const copy=nextProfile(profile,expectedRevision,now);
 if(doc===undefined)throw contractError('INVALID','A master document is required');
 preserveVariantRevision(copy.master);
 copy.master.document=document(doc);
 if(appearance!==undefined)copy.master.appearance=cloneData(object(appearance,'appearance'));
 copy.master.revision++;copy.master.updatedAt=iso(now);
 validateCareerProfile(copy);return copy;
}
/**
 * Explicitly restore a former document/appearance snapshot while recording the
 * displaced current state as another recoverable revision. No auto-restore.
 * A master restore requires the same affirmative confirmation as a master edit.
 */
export function restoreCVRevision(profile,{variantId,snapshotRevision,expectedRevision,
 confirmed=false,now=nowDefault()}={}){
 if(confirmed!==true)throw contractError('UNCONFIRMED','Restoring a CV revision requires explicit confirmation');
 const copy=nextProfile(profile,expectedRevision,now);
 const target=variantId===copy.master.id?copy.master:copy.variants.find(item=>item.id===variantId);
 if(!target)throw contractError('INVALID','Unknown CV variant');
 if(!Number.isSafeInteger(snapshotRevision)||snapshotRevision<0)
  throw contractError('INVALID','Invalid snapshot revision');
 const snapshot=target.history?.find(item=>item.revision===snapshotRevision);
 if(!snapshot)throw contractError('INVALID','Selected prior revision is unavailable');
 const previous=cloneData(snapshot);
 preserveVariantRevision(target);
 target.document=document(previous.document);
 target.appearance=cloneData(object(previous.appearance,'snapshot appearance'));
 target.revision++;target.updatedAt=iso(now);
 validateCareerProfile(copy);
 return copy;
}

/** Plan only. No storage writes or automatic promotion of imported claims to verified. */
export function planLegacyProfileImport(legacy,{now=nowDefault(),idFactory=idDefault}={}){
 if(!validLegacyCVState(legacy))return {status:'blocked',warnings:['Legacy CV schema is incompatible'],proposed:null,requiresUserConfirmation:true};
 const profile=createCareerProfile({document:legacy.document,appearance:legacy.appearance,now,idFactory});
 const warnings=['Imported claims are user assertions, not independently verified achievements'];
 const versions=legacy.versions||[];
 const ids=new Set([profile.master.id]);
 for(const old of versions){
  const variantId=isSafeId(old.id)&&!ids.has(old.id)?old.id:idFactory();
  ids.add(variantId);
  profile.variants.push(variant({id:variantId,masterId:profile.master.id,name:text(old.name,120)&&old.name.trim()?old.name:'Imported CV',document:old.document,
   appearance:isPlainObject(old.appearance)?old.appearance:legacy.appearance,now}));
 }
 validateCareerProfile(profile);
 if(versions.length)warnings.push('Imported versions are separate; original active and master flags require manual review');
 return {status:'review-required',warnings,proposed:profile,requiresUserConfirmation:true,sourceKey:'ledger_cv_state_v2'};
}
export function approveLegacyProfileImport(plan,{confirmed=false}={}){
 if(confirmed!==true||plan?.status!=='review-required'||!plan.proposed)
  throw contractError('UNCONFIRMED','Review and explicit approval required');
 validateCareerProfile(plan.proposed);
 return cloneData(plan.proposed);
}

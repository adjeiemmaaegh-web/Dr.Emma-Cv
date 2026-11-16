/** Group A public contract v1: changing shapes needs a reviewed ADR and adapters. */
export type ErrorCode='CONFLICT'|'INVALID'|'UNAVAILABLE'|'QUOTA'|'CORRUPT'|'UNCONFIRMED';
export interface EvidenceItem {
 id:string; source:'user-asserted'|'document'|'verified-by-user';
 claim:string; sourceRef?:string; path?:string; capturedAt:string;
 /** Must not be inferred from AI confidence or a supplied CV alone. */
 verifiedByUser:boolean;
}
export interface ResumeDocument {
 personalInfo:Record<string,unknown>;summary:string;hobbies:string;references:string;
 experience:Record<string,unknown>[];education:Record<string,unknown>[];
 skills:Record<string,unknown>[];languages:Record<string,unknown>[];
 certifications:Record<string,unknown>[];projects:Record<string,unknown>[];
 accomplishments:Record<string,unknown>[];customSections:Record<string,unknown>[];
 [field:string]:unknown;
}
export interface ResumeVariant {
 id:string; name:string; masterId:string; revision:number;
 document:ResumeDocument;appearance:Record<string,unknown>;
 targetJobId?:string;createdAt:string;updatedAt:string;
}
export interface CareerProfile {
 schemaVersion:1;id:string;revision:number;name:string;
 createdAt:string;updatedAt:string;
 master:ResumeVariant;variants:ResumeVariant[];evidence:EvidenceItem[];
}
export interface JobTarget {
 id:string;role:string;employer?:string;originalText:string;sourceUrl?:string;
 requirements:{id:string;text:string;priority:'required'|'preferred'|'unknown'}[];
}
export interface ApplicationRecord {
 id:string;status:'Saved'|'Applied'|'Interview'|'Offer'|'Rejected'|'Withdrawn';
 company:string;role:string;url?:string;notes?:string;
 cvVariantId?:string;cvRevision?:number;coverLetterId?:string;
}
export interface CoverLetterDocument {
 id:string;jobTargetId?:string;cvVariantId?:string;revision:number;
 content:string;appearance:Record<string,unknown>;
}
export interface InterviewSession {
 id:string;jobTargetId?:string;notes:string;stories:{id:string;context:string;actions:string;results:string}[];
}
export interface ImportReview {
 status:'review-required'|'blocked';warnings:string[];
 proposed:CareerProfile|null;requiresUserConfirmation:true;sourceKey?:string;
}
export interface SuggestionPatch {
 id:string;path:string;before:string;after:string;explanation:string;
 evidenceIds:string[];unsupportedFact:boolean;
 status:'proposed'|'approved'|'rejected';
}
export interface DocumentArtifact {
 format:'pdf'|'docx'|'html';mime:string;bytes:Uint8Array;
 sourceVariantId:string;sourceRevision:number;
}
export interface LocalRecord<T> {revision:number;value:T}
export interface LocalRepositoryPort<T> {
 load(id:string):Promise<LocalRecord<T>|null>;
 save(id:string,value:T,expectedRevision:number|null):Promise<LocalRecord<T>>;
}
export interface FeatureMountContext {
 host:object;services:Record<string,unknown>;
}
export interface FeatureModule {
 id:string;dependencies?:string[];
 mount(context:FeatureMountContext):void|(()=>void)|{dispose():void}|Promise<void|(()=>void)|{dispose():void}>;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { validLegacyCVState, validateLegacyEntry } from '../../src/domain/storage/legacy-shape.mjs';
const doc = () => Object.assign({personalInfo:{},summary:'',hobbies:'',references:''},Object.fromEntries(['experience','education','skills','languages','certifications','projects','accomplishments','customSections'].map(k=>[k,[]])));
test('accepts minimal legacy CV with full required fields',()=>assert.equal(validLegacyCVState({document:doc(),appearance:{}}),true));
test('rejects parseable but structurally invalid primary',()=>assert.equal(validLegacyCVState({document:{},appearance:{}}),false));
test('rejects invalid variants and excessive versions',()=>{assert.equal(validLegacyCVState({document:doc(),appearance:{},versions:[{document:{}}]}),false);assert.equal(validLegacyCVState({document:doc(),appearance:{},versions:Array.from({length:31},()=>({document:doc()}))}),false)});
test('validates separate applications array',()=>{assert.equal(validateLegacyEntry('ledger_cv_stage6_applications_v1',[]),true);assert.equal(validateLegacyEntry('ledger_cv_stage6_applications_v1',{}),false)});

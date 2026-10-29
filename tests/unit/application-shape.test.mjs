import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLegacyApplications} from '../../src/domain/storage/application-shape.mjs';
const record=(id='record_001')=>({id,company:'Example',role:'Analyst',location:'Accra',url:'https://example.com',notes:'Synthetic',date:'2026-10-30',status:'Applied'});
test('valid empty and populated datasets',()=>{assert.equal(validateLegacyApplications([]),true);assert.equal(validateLegacyApplications([record()]),true)});
test('invalid ids, duplicates and counts are rejected',()=>{assert.equal(validateLegacyApplications([record('bad')]),false);assert.equal(validateLegacyApplications([record(),record()]),false);assert.equal(validateLegacyApplications(Array.from({length:301},(_,i)=>record('record_'+String(i).padStart(4,'0')))),false)});
test('invalid fields, urls, dates and statuses rejected',()=>{for(const patch of [{url:'javascript:evil'},{date:'tomorrow'},{status:'Unknown'},{notes:'x'.repeat(3001)},{company:3}])assert.equal(validateLegacyApplications([{...record(),...patch}]),false)});

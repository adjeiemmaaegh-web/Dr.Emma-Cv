import test from 'node:test';
import assert from 'node:assert/strict';
import {createFeatureRegistry} from '../../src/core/feature-registry.mjs';
import {createFrontendComposition} from '../../src/core/composition-root.mjs';
function fakeHost(){
 const children=[];
 return {children,ownerDocument:{createElement:()=>({
  attributes:{},setAttribute(k,v){this.attributes[k]=v},
  focus(){this.focused=true},remove(){const i=children.indexOf(this);if(i>=0)children.splice(i,1)}
 })},append(node){children.push(node)}};
}
test('routes mount one isolated feature at a time with focus and cleanup',async()=>{
 const events=[],registry=createFeatureRegistry(),host=fakeHost();
 for(const id of ['home-feature','editor-feature'])registry.register({id,mount:({host:slot})=>{
  events.push('mount:'+id);assert.equal(slot.className,'ledger-route-slot');
  return ()=>events.push('dispose:'+id);
 }});
 const composer=createFrontendComposition({registry,host,routes:{'/home':'home-feature','/editor':'editor-feature'}});
 await composer.navigate('/home');
 assert.equal(host.children.length,1);assert.equal(host.children[0].focused,true);
 await composer.navigate('/editor');
 assert.equal(composer.currentRoute(),'/editor');assert.equal(host.children.length,1);
 assert.deepEqual(events,['mount:home-feature','dispose:home-feature','mount:editor-feature']);
 await assert.rejects(composer.navigate('/missing'),/Unknown route/);
 assert.equal(composer.currentRoute(),'/editor');
 await composer.dispose();
 assert.equal(host.children.length,0);
 assert.equal(composer.currentRoute(),null);
 await assert.rejects(composer.navigate('/home'),/disposed/);
});
test('failed route mounts clean their slots and allow retry',async()=>{
 const registry=createFeatureRegistry(),host=fakeHost();
 registry.register({id:'failed-feature',mount:()=>{throw Error('fixture failure')}});
 registry.register({id:'ok-feature',mount:()=>{}});
 const composer=createFrontendComposition({registry,host,routes:{'/fail':'failed-feature','/ok':'ok-feature'}});
 await assert.rejects(composer.navigate('/fail'),/fixture failure/);
 assert.equal(host.children.length,0);
 await composer.navigate('/ok');
 assert.equal(host.children.length,1);
 await composer.dispose();
});

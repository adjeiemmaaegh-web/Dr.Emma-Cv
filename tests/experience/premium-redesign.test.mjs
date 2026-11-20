import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');

test('premium stylesheet is included in the workspace and hosted build',()=>{
 const html=read('src/features/experience/workspace/index.html');
 const build=read('tools/build-workspace-vercel.mjs');
 assert.match(html,/href="\.\/premium-editorial\.css"/);
 assert.match(build,/premium-editorial\.css/);
 assert.match(build,/\/src\/features\/experience\/workspace\/premium-editorial\.css/);
});

test('homepage previews use actual CV layout and templates',()=>{
 const views=read('src/features/experience/workspace/views.mjs');
 assert.match(views,/TEMPLATES\.slice\(0,3\)/);
 assert.match(views,/thumbnail\(layoutFor\(SAMPLE_DOC\(\),appearance\)\)/);
 assert.match(views,/class:'lw-hero-stage'/);
});

test('template gallery uses live registry count and batches DOM updates',()=>{
 const views=read('src/features/experience/workspace/views.mjs');
 const start=views.indexOf('export function templatesView');
 const end=views.indexOf('/* ====================== Check',start);
 assert.ok(start>=0&&end>start);
 const gallery=views.slice(start,end);
 assert.match(gallery,/TEMPLATES\.length\+' templates'/);
 assert.match(gallery,/document\.createDocumentFragment\(\)/);
 assert.match(gallery,/grid\.append\(fragment\)/);
 assert.match(gallery,/confirmDesignEditing\(ctx\)/);
});

test('premium editor provides keyboard focus and narrow-screen layout',()=>{
 const css=read('src/features/experience/workspace/premium-editorial.css');
 assert.match(css,/focus-visible/);
 assert.match(css,/\.lw-editor\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(css,/\.lw\[data-theme=dark\]/);
});

// Prepare the static Dr CV build for a GitHub Pages project subpath.
// Run only after npm run build; do not modify source files.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('site');
const base = '/Dr.Emma-Cv/';
const paths = ['/src/', '/legacy/', '/sw.js', '/site.webmanifest', '/favicon.svg', '/index.html', '/site-integrity.json'];
let count = 0;
function visit(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) { visit(full); continue; }
    if (!/\.(html|mjs|js|css|json|webmanifest)$/.test(item.name)) continue;
    let source = fs.readFileSync(full, 'utf8');
    let result = source;
    for (const target of paths) {
      // Preserve protocol-relative URLs and avoid changing already-prefixed paths.
      const pattern = new RegExp('(?<![\\w/:])' + target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(pattern, base + target.slice(1));
    }
    // GitHub Pages cannot grant a service worker scope above the project path.
    if (item.name === 'index.html') {
      result = result.replace("scope:'/'", "scope:'/Dr.Emma-Cv/'");
    }
    if (result !== source) { fs.writeFileSync(full, result); count++; }
  }
}
visit(root);
fs.writeFileSync(path.join(root, '.nojekyll'), '');
console.log('GitHub Pages asset paths adjusted in', count, 'files');

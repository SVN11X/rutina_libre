// Hash the published shell and data; the release cache changes with every edit.
import {createHash}from 'node:crypto';
import {readFile,writeFile,readdir}from 'node:fs/promises';
import {fileURLToPath}from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const paths=['index.html','manifest.webmanifest','data/exercises.json'];
for(const dir of ['js','css'])for(const name of (await readdir(root+dir)).sort())if(/\.(js|css)$/.test(name))paths.push(dir+'/'+name);
const hash=createHash('sha256');for(const path of paths){hash.update(path);hash.update(await readFile(root+path));}
hash.update((await readFile(root+'sw.js','utf8')).replace(/const VERSION = '[^']+';/,"const VERSION = 'release';").replace(/\/\/ SHARED RANGE START[\s\S]*?\/\/ SHARED RANGE END/,'// shared range comes from js/range.js'));
const version='v3.0.0-'+hash.digest('hex').slice(0,12);
const file=root+'sw.js',text=await readFile(file,'utf8');
const range=(await readFile(root+'js/range.js','utf8')).replace(/^export /gm,'');
await writeFile(file,text.replace(/const VERSION = '[^']+';/,`const VERSION = '${version}';`).replace(/\/\/ SHARED RANGE START[\s\S]*?\/\/ SHARED RANGE END/,`// SHARED RANGE START\n${range}\n// SHARED RANGE END`));
console.log('Service worker release:',version);

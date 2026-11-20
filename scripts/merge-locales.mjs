import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const source=JSON.parse(readFileSync('dist/lounge-source.json')),languages=JSON.parse(readFileSync('dist/profile-languages.json')),all={};
for(const [code]of languages){const addition=code==='ko'?Object.fromEntries(Object.keys(source).map(k=>[k,k])):code==='en'?source:JSON.parse(readFileSync('translations-new/'+code+'.json'));const old=JSON.parse(readFileSync('dist/locales/'+code+'.json'));all[code]={...old,...addition};writeFileSync('dist/locales/'+code+'.json',JSON.stringify(all[code],null,2)+'\n')}
const data=gzipSync(Buffer.from(JSON.stringify(all))).toString('base64');
writeFileSync('dist/offline-catalogs.js',`window.LOUNGE_CATALOGS_READY=(async()=>{const b=Uint8Array.from(atob(${JSON.stringify(data)}),c=>c.charCodeAt(0));window.LOUNGE_CATALOGS=JSON.parse(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text())})();`);
writeFileSync('dist/offline-language.js',readFileSync('dist/offline-catalogs.js','utf8')+'\n'+readFileSync('dist/site-language.js','utf8'));
console.log(languages.length+' catalogs merged; '+Object.keys(all.ko).length+' messages');

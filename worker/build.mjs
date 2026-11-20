import './build-offline.mjs';
import {readdirSync,readFileSync,mkdirSync,writeFileSync}from'node:fs';
const assets={},offlineTemplates={},chunks={};
const shared=['offline-catalogs.js','site-language.js','moon.css','board.css','qr.js','board-rules.js','lounge-rules.js','vendor/chess.js','board-client.js','card-art.js','duel-rules.js','extra-games.js'];
for(const file of shared)chunks[file]=readFileSync('dist/'+file,'utf8');
function collect(dir='dist',prefix=''){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(entry.name==='server'||entry.name.startsWith('_'))continue;
  const name=prefix+entry.name,path=dir+'/'+entry.name;if(entry.isDirectory()){collect(path,name+'/');continue}
  if(['offline-catalogs.js','offline-language.js','lounge-source.json','games.json'].includes(name))continue;
  let data=readFileSync(path);
  if(name.endsWith('-offline.html')){
   let html=data.toString();for(const file of shared)html=html.split(chunks[file]).join('<!--LOUNGE:'+file+'-->');offlineTemplates[name]=Buffer.from(html).toString('base64');
  }else assets[name]=data.toString('base64');
 }
}
collect();
const encodedChunks=Object.fromEntries(Object.entries(chunks).map(([k,v])=>[k,Buffer.from(v).toString('base64')]));
const game=readFileSync('dist/app.js','utf8').split('function moon(phase)')[0];
const code=['duel-rules.js','full-moon.js','board-rules.js'].map(f=>readFileSync('dist/'+f,'utf8')).join('\n')+readFileSync('worker/board-online.js','utf8')+readFileSync('worker/online.js','utf8');
const declarations='const assets='+JSON.stringify(assets)+';\nconst offlineTemplates='+JSON.stringify(offlineTemplates)+';\nconst offlineChunks='+JSON.stringify(encodedChunks)+';\nfunction decodeAsset(s){return new TextDecoder().decode(Uint8Array.from(atob(s),c=>c.charCodeAt(0)))}\n';
mkdirSync('dist/server',{recursive:true});writeFileSync('dist/server/index.js',declarations+game+code);
console.log('Worker embeds shared offline resources once.');

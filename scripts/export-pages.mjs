import {cpSync,rmSync,writeFileSync,readFileSync,mkdirSync,readdirSync} from 'node:fs';
const backend='https://royal-room-nov12-e295.mutedwand2.chatgpt.site';
rmSync('docs',{recursive:true,force:true});cpSync('dist','docs',{recursive:true,filter:p=>!p.startsWith('dist/server')});writeFileSync('docs/CNAME','webtronics.run.place\n');writeFileSync('docs/.nojekyll','');
mkdirSync('docs/moonring',{recursive:true});writeFileSync('docs/moonring/index.html',readFileSync('dist/moonring.html','utf8').replace('<head>','<head><base href="/">'));
for(const game of ['','uno/','blackjack/'])writeFileSync('docs/'+game+'online.html',`<!doctype html><html><meta charset="utf-8"><title>Online game</title><script>location.replace(${JSON.stringify(backend+'/'+game+'online.html')}+location.search)</script><p><a href="${backend}/${game}online.html">Online game</a></p></html>`);
for(const game of ['uno','blackjack'])cpSync('dist/card-app-sw.js','docs/'+game+'/sw.js');
for(const p of ['docs/moonring.html','docs/moonring/index.html'])writeFileSync(p,readFileSync(p,'utf8').replace(/href="\.\/online.html/g,`href="${backend}/online.html`));
console.log('Pages files exported; domain and multiplayer backend retained.');

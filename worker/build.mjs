import './build-offline.mjs';
import {readdirSync, readFileSync, mkdirSync, writeFileSync} from 'node:fs';
const assets = {};
for (const entry of readdirSync('dist', {withFileTypes:true})) {
  if (entry.isFile() && !entry.name.startsWith('_')) {
    assets[entry.name] = readFileSync('dist/' + entry.name).toString('base64');
  }
}
for (const game of ['uno','blackjack']) {
  for (const name of readdirSync('dist/' + game)) {
    assets[game+'/'+name] = readFileSync('dist/'+game+'/'+name).toString('base64');
  }
}
const game = readFileSync('dist/app.js', 'utf8').split('function moon(phase)')[0];
const duel = readFileSync('dist/duel-rules.js', 'utf8');
const fullMoon = readFileSync('dist/full-moon.js', 'utf8');
const code = readFileSync('worker/online.js', 'utf8');
mkdirSync('dist/server', {recursive:true});
writeFileSync('dist/server/index.js', 'const assets = ' + JSON.stringify(assets) + ';\n' + game + duel + fullMoon + code);

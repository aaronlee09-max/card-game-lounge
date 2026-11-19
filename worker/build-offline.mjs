import {readFileSync,writeFileSync} from 'node:fs';
for(const game of ['uno','blackjack']) {
  const name=game==='uno'?'우노':'블랙잭';
  const css=readFileSync('dist/moon.css','utf8');
  const code=['card-art.js','duel-rules.js','extra-games.js'].map(file=>readFileSync('dist/'+file,'utf8')).join('\n');
  const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} 오프라인</title><style>${css}</style></head><body><main><section class="extra-game" data-game="${game}"><h1>${name}</h1><p id="game-message" role="status"></p><div id="game-table"></div></section></main><script>${code.replaceAll('</script','<\\/script')}</script></body></html>`;
  writeFileSync('dist/'+game+'/'+game+'-offline.html',html);
}

import {readFileSync,writeFileSync} from 'node:fs';
const scripts=['offline-catalogs.js','site-language.js','qr.js','board-rules.js','lounge-rules.js','vendor/chess.js','board-client.js'];
const css=['moon.css','board.css'].map(f=>readFileSync('dist/'+f,'utf8')).join('\n');
for(const {id}of JSON.parse(readFileSync('dist/games.json'))){
 let html=readFileSync('dist/'+id+'/index.html','utf8');
 html=html.replace(/<link\b[^>]+>/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace('</head>','<style>'+css+'</style></head>').replace('data-board-game="'+id+'"','data-board-game="'+id+'" data-offline="true"');
 const icon='data:image/png;base64,'+readFileSync('dist/'+id+'/icon-192.png').toString('base64');
 html=html.replace('src="./icon-192.png"','src="'+icon+'"').replace('href="/"','href="https://webtronics.run.place/"').replace('href="./install.html"','href="https://webtronics.run.place/'+id+'/install.html"');
 html=html.replace('</body>',scripts.map(f=>'<script>'+readFileSync('dist/'+f,'utf8').replaceAll('</script','<\\/script')+'</script>').join('\n')+'</body>');
 writeFileSync('dist/'+id+'/'+id+'-offline.html',html);
}
// Update the existing standalone moon game without changing its game code.
const moon='dist/moon-offline.html';let html=readFileSync(moon,'utf8');
html=html.replace(/<script>(?:\(async\(\)=>\{const bytes=Uint8Array\.from\(atob|window\.LOUNGE_CATALOGS_READY)[\s\S]*?<\/script>/g,'');
html=html.replace('</body>','<script>'+readFileSync('dist/offline-language.js','utf8')+'</script></body>');writeFileSync(moon,html);
console.log('Seven single-file games and moon offline catalogs rebuilt.');

import{spawnSync}from'node:child_process';
for(const f of ['tests/full-moon.mjs','tests/full-moon-lines.mjs','tests/review-regressions.mjs','tests/board-games.mjs','tests/lounge-games.mjs','tests/translations.mjs','tests/delivery.mjs']){const r=spawnSync('node',[f],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)}

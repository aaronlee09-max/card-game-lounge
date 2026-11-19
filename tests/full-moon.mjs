import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const worker=(await import('data:text/javascript;base64,'+readFileSync('dist/server/index.js').toString('base64'))).default;
const db=new DatabaseSync(':memory:');
db.exec(readFileSync('drizzle/0000_match_queue.sql','utf8'));
const DB={
  prepare(sql) { return {bind(...args) { return {
    first:async()=>db.prepare(sql).get(...args),
    run:async()=>db.prepare(sql).run(...args)
  };}}; },
  async batch(commands) {
    db.exec('BEGIN');
    try { for(const command of commands) await command.run(); db.exec('COMMIT'); }
    catch(error) { db.exec('ROLLBACK'); throw error; }
  }
};
async function call(action,token,extra={},expected=200) {
  const response=await worker.fetch(new Request('https://webtronics.run.place/api/match/'+action,{
    method:'POST',body:JSON.stringify({token,...extra})
  }),{DB});
  const result=await response.json();
  assert.equal(response.status,expected,JSON.stringify(result));
  return result;
}

const a=crypto.randomUUID(),b=crypto.randomUUID();
const invite=await call('invite',a);
await call('join',b,{room:invite.room});
db.prepare('UPDATE matches SET updated=?').run(Date.now()-3500000);
await call('state',a);
assert.ok(db.prepare('SELECT updated FROM matches').get().updated>Date.now()-1000);
let state=await call('state',a);
const dateParts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'2-digit',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
const dateValues = Object.fromEntries(dateParts.map(part=>[part.type,part.value]));
const password = dateValues.year+dateValues.month+dateValues.day;
await call('full-moon',a,{password:'wrong',version:state.version},403);
await call('full-moon',b,{password,version:state.version},409);
state=await call('full-moon',a,{password,version:state.version});
assert.deepEqual(state.hand,[4,4,4]);
const guest=await call('state',b);
assert.ok(!('hands' in guest.state));
state = await call('move',a,{index:0,slot:0,version:state.version});
assert.deepEqual(state.hand,[4,4,4]);

for(let stage=0;stage<3;stage++) {
  assert.equal(state.state.stage,stage);
  assert.deepEqual((await call('state',a)).hand,[4,4,4]);
  while(state.state.turn!==-1) {
    state=await call('move',state.state.turn?b:a,{
      index:state.state.board.indexOf(null),slot:0,version:state.version
    });
  }
  if(stage<2) {
    state=await call('next',a,{version:state.version});
    state=await call('next',b,{version:state.version});
  }
}
for(const game of ['uno','blackjack']) {
  const one=crypto.randomUUID(),two=crypto.randomUUID();
  const room=await call('invite',one,{game});
  const joined=await call('join',two,{room:room.room});
  assert.equal(joined.state.game,game);
  assert.ok(!('deck' in joined.state));
  assert.ok(!('hands' in joined.state));
  await call('move',joined.state.turn?one:two,{action:'stand',version:joined.version},409);
}

for(const [path,scope] of [['/sw.js','/'],['/uno/sw.js','/uno/'],['/blackjack/sw.js','/blackjack/']]) {
  const source=await (await worker.fetch(new Request('https://webtronics.run.place'+path))).text();
  const handlers={},requests=[];
  const cache={addAll:async values=>requests.push(...values)};
  vm.runInNewContext(source,{
    URL,Request: class extends Request { constructor(input,options) { super(new URL(input,'https://webtronics.run.place'+scope),options); } },caches:{open:async()=>cache},
    self:{location:new URL(path,'https://webtronics.run.place'),registration:{scope:'https://webtronics.run.place'+scope},
      addEventListener:(name,callback)=>handlers[name]=callback}
  });
  let job;
  handlers.install({waitUntil:promise=>job=promise});
  await job;
  assert.ok(requests.some(request=>request.url.endsWith('/card-art.js')));
  for(const request of requests) assert.equal((await worker.fetch(request)).status,200,request.url);
}
console.log('Session heartbeat, three-stage synchronization, private hands, turn checks and all offline assets passed.');

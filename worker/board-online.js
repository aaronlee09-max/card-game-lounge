function boardJSON(data,status=200){return Response.json(data,{status,headers:{'cache-control':'no-store','access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'}})}
async function boardOnline(request,env,path){
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'}});
 if(request.method!=='POST')return boardJSON({error:'POST 요청이 필요해요.'},405);
 const text=await request.text();if(text.length>16384)return boardJSON({error:'요청이 너무 커요.'},413);
 let b;try{b=JSON.parse(text)}catch{return boardJSON({error:'요청을 확인하세요.'},400)}
 const {token,game}=b;if(!/^[a-f0-9-]{36}$/.test(token||'')||!BoardRules.games.includes(game))return boardJSON({error:'게임 세션이 올바르지 않아요.'},400);
 const db=env.DB,now=Date.now(),find=()=>db.prepare("SELECT * FROM matches WHERE (first_token=? OR second_token=?) AND id LIKE 'i-b%' ").bind(token,token).first();let row=await find();
 const name=typeof b.name==='string'?b.name.trim().slice(0,20)||'플레이어':'플레이어';
 if(!row&&['invite','queue','join'].includes(path)){
  if(path==='join'){
   if(!/^i-bi-[a-f0-9-]{36}$/.test(b.room||''))return boardJSON({error:'초대 주소가 올바르지 않아요.'},400);
   const waiting=await db.prepare('SELECT * FROM matches WHERE id=? AND second_token IS NULL AND updated>?').bind(b.room,now-300000).first();
   if(!waiting)return boardJSON({error:'방이 만료됐거나 이미 두 명이 들어왔어요.'},404);
   const s=JSON.parse(waiting.state);if(s.game!==game)return boardJSON({error:'다른 게임의 방이에요.'},400);s.names[1]=name;
   await db.prepare('UPDATE matches SET second_token=?,state=?,version=version+1,updated=? WHERE id=? AND second_token IS NULL').bind(token,JSON.stringify(s),now,b.room).run();
  }else if(path==='queue'){
   const id='i-bq-'+crypto.randomUUID();
   await db.batch([db.prepare(`UPDATE matches SET second_token=?,state=json_set(state,'$.names[1]',?),version=version+1,updated=? WHERE id=(SELECT id FROM matches WHERE id LIKE 'i-bq-%' AND json_extract(state,'$.game')=? AND second_token IS NULL AND updated>? AND first_token!=? ORDER BY updated LIMIT 1) AND second_token IS NULL AND NOT EXISTS (SELECT 1 FROM matches WHERE first_token=? OR second_token=?)`).bind(token,name,now,game,now-120000,token,token,token),db.prepare('INSERT OR IGNORE INTO matches (id,first_token,updated,state) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM matches WHERE first_token=? OR second_token=?)').bind(id,token,now,JSON.stringify(BoardRules.create(game,name)),token,token)]);
  }else await db.prepare('INSERT OR IGNORE INTO matches (id,first_token,updated,state) VALUES (?,?,?,?)').bind('i-bi-'+crypto.randomUUID(),token,now,JSON.stringify(BoardRules.create(game,name))).run();
  row=await find();
 }
 if(!row||row.updated<now-3600000)return boardJSON({error:'방이 만료됐어요. 새 대전을 시작하세요.'},404);
 const seat=row.first_token===token?0:1,s=JSON.parse(row.state);if(s.game!==game)return boardJSON({error:'세션 게임이 달라요.'},409);
 if(path==='move'){
  if(!row.second_token||row.version!==b.version)return boardJSON({error:'상태가 바뀌었어요. 다시 시도하세요.'},409);
  if(!BoardRules.move(s,seat,b))return boardJSON({error:'규칙에 맞지 않거나 내 차례가 아니에요.'},409);
  const result=await db.prepare('UPDATE matches SET state=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify(s),now,row.id,row.version).run();if(!result.meta.changes)return boardJSON({error:'상대가 먼저 움직였어요.'},409);row=await find();
 }else if(path==='leave'){
  if(!row.second_token)await db.prepare('DELETE FROM matches WHERE id=? AND second_token IS NULL').bind(row.id).run();else{s.turn=-1;s.winner=1-seat;s.message='상대가 대전을 나갔어요.';await db.prepare('UPDATE matches SET state=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify(s),now,row.id,row.version).run();}return boardJSON({ok:true});
 }else if(!['invite','queue','join','state'].includes(path))return boardJSON({error:'알 수 없는 요청이에요.'},404);
 await db.prepare('UPDATE matches SET updated=? WHERE id=?').bind(now,row.id).run();
 const stored=JSON.parse(row.state);return boardJSON({...BoardRules.view(stored,seat),seat,version:row.version,waiting:!row.second_token,room:row.id.startsWith('i-bi-')&&seat===0?row.id:undefined});
}

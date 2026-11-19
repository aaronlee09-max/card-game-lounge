const waitingMs = 120000;
const roomMs = 3600000;
const pickCard = () => crypto.getRandomValues(new Uint8Array(1))[0] % 8;
const tokenPattern = /^[a-f0-9-]{36}$/;
const json = (data, status = 200) => Response.json(data, {status, headers: {'cache-control':'no-store'}});

function freshState(name, series = false) {
  return { names:[name,null], ...(series ? {stage:0, wins:[0,0], ready:[false,false]} : {}), ...round(0,0) };
}

function round(stage, starter) {
  return { board:levels[stage].shape.join('').split('').map(cell => cell === '#' ? null : false),
    hands:Array.from({length:2}, () => Array.from({length:3}, pickCard)),
    scores:[0,0], turn:starter, last:null, points:0 };
}

function publicState(row, seat) {
  const stored = JSON.parse(row.state);
  const {hands, ...state} = stored;
  const view = stored.game ? duelView(stored,seat) : {state, hand:hands[seat]};
  return json({ ...view, seat, version:row.version, waiting:!row.second_token, room:row.id.startsWith('i-') && seat === 0 ? row.id : undefined });
}

async function online(request, env, path) {
  if (request.method !== 'POST') return json({error:'지원하지 않는 요청이에요.'},405);
  if (Number(request.headers.get('content-length')) > 2048) return json({error:'요청이 너무 커요.'},413);
  const body = await request.json().catch(() => null);
  const token = body?.token;
  if (typeof token !== 'string' || !tokenPattern.test(token)) return json({error:'세션이 올바르지 않아요.'},400);
  const db = env.DB;
  const now = Date.now();
  const find = () => db.prepare('SELECT * FROM matches WHERE first_token = ? OR second_token = ?').bind(token,token).first();
  let row = await find();

  if ((path === 'invite' || path === 'join') && !row) {
    const name = typeof body.name === 'string' ? body.name.trim().slice(0,20) || '플레이어' : '플레이어';
    if (path === 'invite') {
      const game = ['uno','blackjack'].includes(body.game) ? body.game : null;
      await db.prepare('INSERT OR IGNORE INTO matches (id,first_token,updated,state) VALUES (?,?,?,?)')
        .bind('i-'+crypto.randomUUID(),token,now,JSON.stringify(game ? newDuel(game,name) : freshState(name,true))).run();
    } else {
      if (typeof body.room !== 'string' || !/^i-[a-f0-9-]{36}$/.test(body.room)) return json({error:'초대 주소를 확인해 주세요.'},400);
      const waiting = await db.prepare('SELECT * FROM matches WHERE id=? AND second_token IS NULL AND updated >= ?')
        .bind(body.room,now-waitingMs).first();
      if (waiting) {
        const state = JSON.parse(waiting.state);
        state.names[1] = name;
        if (state.game === 'blackjack') startDuelBJ(state);
        await db.prepare(`UPDATE matches SET second_token=?, updated=?, version=version+1, state=?
          WHERE id=? AND second_token IS NULL AND updated >= ?`)
          .bind(token,now,JSON.stringify(state),body.room,now-waitingMs).run();
      }
    }
    row = await find();
  }

  if (path === 'queue' && !row) {
    const label = typeof body.name === 'string' ? body.name.trim().slice(0,20) : '';
    const name = label || '플레이어';
    if (Math.random() < .05) await db.prepare('DELETE FROM matches WHERE updated < ?').bind(now-roomMs).run();

    // One statement claims the oldest waiting seat. Concurrent arrivals cannot share it.
    await db.batch([db.prepare(`UPDATE matches SET second_token = ?, updated = ?, version = version + 1,
      state = json_set(state, '$.names[1]', ?)
      WHERE id = (SELECT id FROM matches WHERE second_token IS NULL AND updated >= ? AND substr(id,1,2) != 'i-'
      AND first_token != ? ORDER BY updated LIMIT 1)
      AND second_token IS NULL AND NOT EXISTS (SELECT 1 FROM matches WHERE first_token = ? OR second_token = ?)`).bind(token,now,name,now-waitingMs,token,token,token),
      db.prepare('INSERT OR IGNORE INTO matches (id,first_token,updated,state) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM matches WHERE second_token = ?)')
        .bind(crypto.randomUUID(),token,now,JSON.stringify(freshState(name)),token)]);
    row = await find();
  }

  if (!row || row.updated < now-roomMs) return json({error:'매칭 세션이 만료됐어요. 다시 매칭해 주세요.'},404);
  const seat = row.first_token === token ? 0 : 1;
  if (path === 'leave') {
    if (!row.second_token) await db.prepare('DELETE FROM matches WHERE id = ? AND second_token IS NULL').bind(row.id).run();
    await db.prepare(`UPDATE matches SET state=json_set(state,'$.turn',-1,'$.resigned',?),
      version=version+1, updated=? WHERE id=? AND second_token IS NOT NULL AND (json_extract(state,'$.turn') != -1 OR (json_extract(state,'$.stage') < 2 AND json_extract(state,'$.resigned') IS NULL))`)
      .bind(seat,now,row.id).run();
    return json({ok:true});
  }
  if (['queue','state','invite','join'].includes(path)) {
    await db.prepare('UPDATE matches SET updated = ? WHERE id = ?').bind(now,row.id).run();
    return publicState(await find() ?? row,seat);
  }
  const state = JSON.parse(row.state);
  const {slot,index,version} = body;
  const stage = state.stage ?? 0;
  if (!row.second_token || row.version !== version) return json({error:'게임 상태가 바뀌었어요.'},409);
  if (path === 'full-moon') {
    if (state.game || state.turn !== seat) return json({error:'내 차례에 사용할 수 있어요.'},409);
    if (body.password !== fullMoonPassword()) return json({error:'비밀번호가 맞지 않아요.'},403);
    state.fullMoonSeats ??= [false,false];
    state.fullMoonSeats[seat] = true;
    state.hands[seat] = state.hands[seat].map(()=>4);
  } else if (state.game) {
    if (path !== 'move' || !duelAction(state,seat,body)) return json({error:'지금은 이 동작을 할 수 없어요.'},409);
  } else if (path === 'next') {
    if (state.stage === undefined || state.turn !== -1 || stage >= levels.length-1 ||
        state.resigned !== undefined) return json({error:'다음 단계를 열 수 없어요.'},409);
    if (state.ready[seat]) return publicState(row,seat);
    state.ready[seat] = true;
    if (state.ready.every(Boolean)) {
      state.stage++;
      Object.assign(state,round(state.stage,state.stage % 2));
      state.hands = state.hands.map((hand,player)=>state.fullMoonSeats?.[player] ? hand.map(()=>4) : hand);
      state.ready = [false,false];
    }
  } else if (path === 'move') {
    if (state.turn !== seat || !Number.isInteger(slot) || slot < 0 || slot > 2 ||
        !Number.isInteger(index) || state.board[index] !== null) {
      return json({error:'지금은 그 카드를 놓을 수 없어요.'},409);
    }
    const phase = state.hands[seat][slot];
    const matches = combinations(state.board,index,phase,levels[stage].width);
    state.board[index] = {phase,index,owner:seat};
    state.points = matches.reduce((sum,match) => sum+match.score,0);
    state.last = index;
    state.matched = [...new Set(matches.flatMap(match => match.cards))];
    state.matchNames = [...new Set(matches.map(match => match.name))];
    for (const i of state.matched) state.board[i].owner = seat;
    state.scores[seat] += state.points;
    state.hands[seat][slot] = state.fullMoonSeats?.[seat] ? 4 : pickCard();
    state.turn = state.board.includes(null) ? 1-seat : -1;
    if (state.turn === -1) {
      for (const card of state.board) if (card) state.scores[card.owner]++;
      if (state.wins && state.scores[0] !== state.scores[1]) {
        state.wins[Number(state.scores[1] > state.scores[0])]++;
      }
    }
  } else return json({error:'잘못된 주소예요.'},404);
  const updated = await db.prepare('UPDATE matches SET state = ?, version = version + 1, updated = ? WHERE id = ? AND version = ? RETURNING *')
    .bind(JSON.stringify(state),now,row.id,version).first();
  if (!updated) return json({error:'게임 상태가 바뀌었어요.'},409);
  return publicState(updated,seat);
}

const contentTypes = {html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',
  png:'image/png',webmanifest:'application/manifest+json',mobileconfig:'application/x-apple-aspen-config',shortcut:'application/octet-stream'};

export default {
  async fetch(request,env) {
    const {pathname} = new URL(request.url);
    if (pathname.startsWith('/api/match/')) {
      try { return await online(request,env,pathname.slice('/api/match/'.length)); }
      catch { return json({error:'매칭 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'},503); }
    }
    if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405});
    const gameRoute = pathname.match(/^\/(uno|blackjack)(?:\.html)?$/);
    if (gameRoute) {
      const target = new URL(request.url);
      target.pathname = '/' + gameRoute[1] + '/';
      return Response.redirect(target.href,302);
    }
    const name = pathname === '/moonring' ? 'moonring.html'
      : /^\/(uno|blackjack)\/online\.html$/.test(pathname) ? 'online.html'
      : /^\/(uno|blackjack)\/sw\.js$/.test(pathname) ? 'card-app-sw.js'
      : pathname.endsWith('/') ? pathname.slice(1)+'index.html' : pathname.slice(1);
    if (!Object.hasOwn(assets,name)) return new Response('Not found',{status:404});
    const type = contentTypes[name.split('.').at(-1)] || 'application/octet-stream';
    return new Response(request.method === 'HEAD' ? null : Uint8Array.from(atob(assets[name]),c=>c.charCodeAt(0)),
      {headers:{'content-type':type,'cache-control':'no-cache','x-content-type-options':'nosniff'}});
  }
};

const $ = id => document.getElementById(id);
const phaseNames = ['삭','초승달','상현달','차는 볼록달','보름달','지는 볼록달','하현달','그믐달'];
const glyphs = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
const params = new URLSearchParams(location.search);
const room = params.get('room');
const mode = params.get('mode');
const game = ['uno','blackjack'].includes(params.get('game')) ? params.get('game') : null;
const localMode = game && mode==='local' && !room;
const duelLabel = type => type==='uno' ? '우노' : '블랙잭';
const queueAction = room ? 'join' : mode === 'link' || mode === 'qr' ? 'invite' : 'queue';
$('match-title').textContent = room ? '친구 초대 참여' : mode === 'qr' ? 'QR 초대 매칭' : mode === 'link' ? '링크 초대 매칭' : '온라인 자동 매칭';
$('queue').querySelector('button').textContent = room ? '참여하기' : queueAction === 'invite' ? '초대 방 만들기' : '매칭 시작';
$('match-status').textContent = room ? '이름을 입력하고 친구의 방에 참여하세요.' : queueAction === 'invite' ? '방을 만든 뒤 링크 또는 QR을 친구에게 보여 주세요.' : '다른 기기에서도 매칭을 시작하면 자동으로 연결돼요.';
if (game) {
  $('match-title').textContent = duelLabel(game) + ' · ' + (localMode ? '한 기기 2인' : $('match-title').textContent);
  $('game-home').href = '/' + game + '/';
}
const storageKey = 'moon-match:' + location.search;
let token, current, selected, timer, busy = false, cancelDrag;

function remember(value) {
  try {
    if (value) sessionStorage.setItem(storageKey,value);
    else sessionStorage.removeItem(storageKey);
  } catch {}
}

async function send(path, data = {}) {
  const response = await fetch('/api/match/' + path, {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({token,...data}), signal:AbortSignal.timeout(10000)
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error),{status:response.status});
  return result;
}

function render(result) {
  if (current && result.version < current.version) return;
  const changed = current?.version !== result.version;
  current = result;
  const {state, seat, waiting, hand} = result;
  $('full-moon').hidden = waiting || Boolean(state.game);
  $('full-moon').disabled = state.turn !== seat || handoff;
  $('online-game').hidden = waiting;
  $('invite-box').hidden = !waiting || !result.room;
  if (waiting && result.room) {
    const url = new URL(state.game ? '/' + state.game + '/online.html' : '/online.html','https://webtronics.run.place');
    url.searchParams.set('room',result.room);
    url.searchParams.set('lang',window.LoungeI18n?.language||'ko');
    if (state.game) url.searchParams.set('game',state.game);
    const anchor = $('invite-url');
    if (anchor.href !== url.href) {
      anchor.href = url.href;
      anchor.textContent = url.href;
      if (mode === 'qr') {
        drawInviteQR($('invite-qr'),url.href);
        $('invite-qr').hidden = false;
      }
    }
    $('match-status').textContent = '친구가 들어오기를 기다리고 있어요.';
    return;
  }
  if (waiting) {
    $('match-status').textContent = '상대를 찾는 중… 다른 기기에서도 매칭을 시작해 주세요.';
    return;
  }
  if (!changed) return;
  cancelDrag?.();
  selected = undefined;
  $('duel-table').hidden = !state.game;
  $('online-board').hidden = Boolean(state.game);
  $('online-hand').hidden = Boolean(state.game);
  if (state.game) {
    renderCardDuel(state,seat,hand);
    return;
  }
  const ownTurn = state.turn === seat;
  const series = Number.isInteger(state.stage);
  const between = series && state.turn === -1 && state.stage < 2 && state.resigned === undefined;
  const medal = series && state.turn === -1 && state.stage === 2;
  const scores = medal ? state.wins : state.scores;
  const winner = Number.isInteger(state.resigned) ? (state.resigned === seat ? '대전을 나갔어요.' : '상대가 나갔어요. 내 승리!') :
    (medal ? '최종 결과 · ' : between ? '이번 단계 · ' : '') +
    (scores[0] === scores[1] ? '무승부!' : state.names[Number(scores[1] > scores[0])] + ' 승리!');
  const gain = state.points && state.turn !== -1 ? ' · ' + (state.matchNames?.join(' · ') || '득점') + ' +' + state.points + '점' : '';
  $('match-status').textContent = (state.turn === -1 ? winner : ownTurn ? '내 차례예요' : '상대 차례예요') + gain;
  $('series-progress').hidden = !series;
  if (series) $('series-progress').textContent = (state.stage + 1) + ' / 3 단계 · 획득 별 나 ' + state.wins[seat] + ' : ' + state.wins[1-seat] + ' 상대';
  $('next-stage').hidden = !between;
  if (between) {
    $('next-stage').disabled = state.ready[seat];
    $('next-stage').textContent = state.ready[seat] ? '상대 준비를 기다리는 중…' : '다음 단계 준비';
  }
  $('score-a').textContent = state.names[seat] + ' (나) · ' + state.scores[seat];
  $('score-b').textContent = state.names[1-seat] + ' (상대) · ' + state.scores[1-seat];
  const cols = [3,4,5][state.stage ?? 0];
  $('online-board').style.setProperty('--cols',cols);
  $('online-board').style.setProperty('--connector', cols === 5 ? '10px' : cols === 4 ? '16px' : '24px');
  $('online-board').replaceChildren(...state.board.map((card,index)=>{
    if (card === false) {
      const gap = document.createElement('span');
      gap.className = 'void';
      return gap;
    }
    const button = document.createElement('button');
    button.className = 'tile';
    if (index % cols < cols-1 && state.board[index+1] !== false) button.classList.add('east');
    if (index + cols < state.board.length && state.board[index+cols] !== false) button.classList.add('south');
    button.disabled = !!card || !ownTurn;
    button.dataset.index = index;
    button.setAttribute('aria-label', card ? phaseNames[card.phase] : (index+1) + '번 빈 칸');
    if (card) {
      button.textContent = glyphs[card.phase];
      button.classList.add('filled', card.owner === seat ? 'mine' : 'theirs');
      if (index === state.last) button.classList.add('last');
      if (state.matched?.includes(index)) button.classList.add('matched','online-match-glow');
    }
    button.onclick = () => play(selected,index);
    return button;
  }));
  $('online-hand').replaceChildren(...hand.map((phase,slot)=>{
    const button = document.createElement('button');
    button.className = 'card';
    button.disabled = !ownTurn;
    button.setAttribute('aria-pressed','false');
    const label = document.createElement('small');
    label.textContent = phaseNames[phase];
    button.append(glyphs[phase], label);
    button.onclick = () => {
      selected = slot;
      for (const [i,card] of [...$('online-hand').children].entries()) card.setAttribute('aria-pressed',String(i===slot));
    };
    button.onpointerdown = event => startDrag(event,button,slot,phase);
    return button;
  }));
  $('cancel-match').textContent = state.turn === -1 && !between ? '다시 매칭' : '나가기';
}

function startDrag(event, button, slot, phase) {
  if (!event.isPrimary || event.button !== 0 || busy || cancelDrag) return;
  const pointer = event.pointerId;
  const {clientX:x,clientY:y} = event;
  let ghost,target;
  button.setPointerCapture(pointer);
  const findTile = e => document.elementFromPoint(e.clientX,e.clientY)?.closest('#online-board .tile:not(:disabled)');
  function move(e) {
    if (e.pointerId !== pointer || (!ghost && Math.hypot(e.clientX-x,e.clientY-y)<7)) return;
    if (!ghost) {
      ghost = document.createElement('div');
      ghost.className = 'card drag-ghost';
      ghost.textContent = glyphs[phase];
      ghost.style.width = '52px';
      ghost.setAttribute('aria-hidden','true');
      document.body.append(ghost);
    }
    ghost.style.left = e.clientX + 'px';
    ghost.style.top = e.clientY + 'px';
    target?.classList.remove('drop-target');
    target = findTile(e);
    target?.classList.add('drop-target');
  }
  function clean() {
    ghost?.remove();
    target?.classList.remove('drop-target');
    cancelDrag = undefined;
    button.removeEventListener('pointermove',move);
    for (const type of ['pointerup','pointercancel','lostpointercapture']) button.removeEventListener(type,end);
    if (button.hasPointerCapture(pointer)) button.releasePointerCapture(pointer);
  }
  function end(e) {
    if (e.pointerId !== pointer) return;
    const tile = ghost && e.type === 'pointerup' ? findTile(e) : null;
    clean();
    if (tile) play(slot,Number(tile.dataset.index));
  }
  cancelDrag = clean;
  button.addEventListener('pointermove',move);
  for (const type of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(type,end);
}

async function play(slot,index) {
  if (busy || !current || current.state.turn !== current.seat) return;
  if (slot === undefined) {
    $('match-status').textContent = '먼저 카드를 선택하거나 끌어 놓으세요.';
    return;
  }
  busy = true;
  const session = token;
  try {
    const next = await send('move',{slot,index,version:current.version});
    if (token === session) render(next);
  } catch (err) {
    if (token === session) {
      $('match-status').textContent = err.message;
      if (err.status === 409) {
        try {
          const latest = await send('state');
          if (token === session) render(latest);
        } catch {}
      }
    }
  } finally {
    if (token === session) busy = false;
  }
}

function clearMatch() {
  clearTimeout(timer);
  $('retry-match').hidden = true;
  cancelDrag?.();
  token = current = undefined;
  remember(null);
  busy = false;
  $('queue').hidden = false;
  $('online-game').hidden = true;
  $('invite-box').hidden = true;
  $('cancel-match').hidden = true;
  $('cancel-match').textContent = '나가기';
}
function poll(session) {
  timer = setTimeout(async () => {
    if (session !== token) return;
    try {
      if (!busy) {
        const next = await send('state');
        if (session !== token) return;
        if (!current || next.version >= current.version) render(next);
      }
    } catch (err) {
      if (session !== token) return;
      if (err.status === 404) clearMatch();
      $('match-status').textContent = err.status === 404 ? err.message : '연결을 다시 시도하고 있어요…';
    }
    const state = current?.state;
    const continuing = !state || state.turn !== -1 ||
      (Number.isInteger(state.stage) && state.stage < 2 && state.resigned === undefined);
    if (session === token && continuing) poll(session);
  },1200);
}
$('queue').onsubmit = async event => {
  event.preventDefault();
  token = crypto.randomUUID();
  const session = token;
  const name = new FormData(event.currentTarget).get('name');
  $('queue').hidden = true;
  $('match-status').textContent = '매칭 서버에 연결하는 중…';
  try {
    const result = await send(queueAction,{name,room,game});
    if (session !== token) return;
    $('cancel-match').hidden = false;
    remember(token);
    render(result);
    poll(session);
  } catch (err) {
    if (session !== token) return;
    if (err.status && err.status < 500) {
      clearMatch();
      $('match-status').textContent = err.message;
    } else {
      // Retain the same idempotent session if the server accepted the first request.
      remember(session);
      $('cancel-match').hidden = false;
      $('match-status').textContent = '연결을 확인하는 중… 다시 연결을 누르세요.';
      $('retry-match').hidden = false;
    }
  }
};
$('cancel-match').onclick = () => {
  send('leave').catch(()=>{});
  clearMatch();
  $('match-status').textContent = '매칭 시작을 누르면 새 상대를 찾아요.';
};

$('copy-invite').onclick = async () => {
  try {
    await navigator.clipboard.writeText($('invite-url').href);
    $('match-status').textContent = '초대 링크를 복사했어요.';
  } catch { $('match-status').textContent = '위 링크를 길게 눌러 복사해 주세요.'; }
};

async function resume() {
  try { token = sessionStorage.getItem(storageKey); } catch { return; }
  if (!token) return;
  $('queue').hidden = true;
  $('cancel-match').hidden = false;
  $('match-status').textContent = '대전에 다시 연결하는 중…';
  try {
    const session = token;
    const result = await send('state');
    if (session !== token) return;
    render(result);
    poll(session);
  } catch (error) {
    if (error.status === 404) clearMatch();
    else if (token) poll(token);
    $('match-status').textContent = error.message;
  }
}
if (!localMode) resume();

$('next-stage').onclick = async () => {
  if (busy || !current) return;
  busy = true;
  const session = token;
  try {
    const next = await send('next',{version:current.version});
    if (session === token) render(next);
  } catch (error) {
    if (session === token && error.status !== 409) $('match-status').textContent = error.message;
    else if (session === token && error.status === 409) {
      try {
        const latest = await send('state');
        if (session === token && latest.version >= current.version) render(latest);
        if (session === token && !latest.state.ready?.[latest.seat] && latest.state.turn === -1) {
          $('match-status').textContent = '상대가 준비했어요. 다음 단계 준비를 다시 눌러 주세요.';
        }
      } catch {}
    }
  } finally { if (session === token) busy = false; }
};

let localState, localVersion=0, handoff=false;

function make(tag,text,cls) {
  const node=document.createElement(tag);
  if(text!==undefined) node.textContent=text;
  if(cls) node.className=cls;
  return node;
}
function duelButton(text,handler,disabled=false,className='primary') {
  const button=make('button',text,className);
  button.disabled=disabled;
  button.onclick=handler;
  return button;
}
function unoTile(card,handler,disabled) {
  const label=duelColorNames[card.color]+' '+card.value;
  const node=handler?duelButton(label,handler,disabled,'playing-card uno-card'):make('span',label,'playing-card uno-card');
  drawUnoCard(node,card,label);
  return node;
}
function bjRow(cards,hidden=false) {
  const row=make('div',undefined,'card-row');
  for(const card of cards) row.append(drawBlackjackCard(card));
  if(hidden) row.append(drawBlackjackCard(null));
  return row;
}

function renderCardDuel(state,seat,hand) {
  const isUno=state.game==='uno';
  const ended=state.turn===-1;
  const ownTurn=state.turn===seat&&!handoff;
  const title=duelLabel(state.game);
  $('match-title').textContent = title + (localMode?' · 한 기기 2인':' · 친구 대전');
  if (!localMode) $('game-home').href='/'+state.game+'/';
  $('series-progress').hidden=true;
  $('next-stage').hidden=true;
  const scores = ended ? state.scores : null;
  const winner = scores && (isUno && Number.isInteger(state.winner) ? state.names[state.winner]+' 승리 · '+scores[state.winner]+'점' : scores[0]===scores[1]?'무승부!':state.names[Number(scores[1]>scores[0])]+' 승리!');
  const result = Number.isInteger(state.resigned) ? state.names[state.resigned]+' 님이 나갔어요.' : winner;
  $('match-status').textContent=ended?result:handoff?state.names[state.turn]+' 님에게 기기를 넘겨주세요.':
    localMode?state.names[state.turn]+' 차례예요.':ownTurn?'내 차례예요.':'상대 차례예요.';
  $('score-a').textContent=state.names[seat]+(isUno?' · '+state.handCounts[seat]+'장':ended?' · '+state.scores[seat]+'칩':'');
  $('score-b').textContent=state.names[1-seat]+(isUno?' · '+state.handCounts[1-seat]+'장':ended?' · '+state.scores[1-seat]+'칩':'');
  $('cancel-match').textContent=ended?'닫기':'나가기';
  const controls=make('div',undefined,'game-controls');
  const cards=make('div',undefined,'card-row');
  const panel=$('duel-table');
  if(handoff) {
    panel.replaceChildren(duelButton('기기를 받았어요',()=>{
      handoff=false;
      renderLocal();
      panel.querySelector('button')?.focus();
    }));
    return;
  }
  if(isUno) {
    const top=make('div',undefined,'card-row');
    top.append(unoTile(state.top));
    const visibleHand={...state,discard:[state.top],hands:seat===0?[hand,[]]:[[],hand]};
    if(!ended) hand.forEach((card,slot)=>cards.append(unoTile(card,()=>{
      if(card.color==='wild') {
        controls.replaceChildren(...duelColors.map(color=>duelButton(duelColorNames[color],()=>submitDuel({action:'play',slot,color}))),
          duelButton('취소',()=>renderCardDuel(state,seat,hand)));
      } else submitDuel({action:'play',slot});
    },!ownTurn||!unoCanPlay(visibleHand,seat,card)||(state.drew&&slot!==hand.length-1))));
    if(!ended) controls.append(duelButton('한 장 뽑기',()=>submitDuel({action:'draw'}),!ownTurn||state.drew),
      duelButton('차례 넘기기',()=>submitDuel({action:'pass'}),!ownTurn||!state.drew));
    panel.replaceChildren(top,make('p','현재 색 · '+duelColorNames[state.color],'subtle'),cards,controls);
  } else {
    const showAll=Boolean(state.finalHands);
    if(!ended) controls.append(...[['히트','hit'],['스탠드','stand'],['더블','double']].map(([label,action])=>
      duelButton(label,()=>submitDuel({action}),!ownTurn||(action==='double'&&hand.length!==2))));
    const labels=showAll?state.finalHands.flatMap((h,i)=>[
      make('p',state.names[i]+' · '+duelValue(h)+' · '+state.outcomes[i],'subtle'),bjRow(h)
    ]):[make('p',state.names[seat]+' · '+duelValue(hand),'subtle'),bjRow(hand)];
    panel.replaceChildren(make('p','딜러'+(showAll?' · '+duelValue(state.dealer):''),'subtle'),
      bjRow(state.dealer,!showAll),...labels,controls,make('p','두 사람 모두 같은 딜러와 겨뤄요. 각자 가상 10칩으로 시작해요.','subtle'));
  }
  if(localMode&&ended) panel.append(duelButton('다시 대전',startLocal));
}

async function submitDuel(data) {
  if(busy||!current||current.state.turn!==current.seat||handoff) return;
  if(localMode) {
    const seat=current.seat;
    if(!duelAction(localState,seat,data)) return;
    handoff=localState.turn>=0&&localState.turn!==seat;
    renderLocal();
    return;
  }
  const session=token;
  busy=true;
  try {
    const next=await send('move',{...data,version:current.version});
    if(session===token) render(next);
  } catch(error) {
    if(session===token) $('match-status').textContent=error.message;
  } finally { if(session===token) busy=false; }
}
function renderLocal() {
  const seat=localState.turn<0?0:localState.turn;
  render({...duelView(localState,seat),seat,version:++localVersion,waiting:false});
}
function startLocal() {
  localState=newDuel(game,'1P');
  localState.names[1]='2P';
  if(game==='blackjack') startDuelBJ(localState);
  handoff=false;
  renderLocal();
}
if(localMode) {
  $('queue').hidden=true;
  startLocal();
}

$('retry-match').onclick = async () => {
  if (!token || busy) return;
  busy = true;
  const session = token;
  try {
    const name = new FormData($('queue')).get('name');
    const result = await send(queueAction,{name,room,game});
    if (session !== token) return;
    $('retry-match').hidden = true;
    render(result);
    poll(session);
  } catch(error) {
    if (session === token) $('match-status').textContent = error.message;
  } finally { if (session === token) busy = false; }
};


$('full-moon').onclick = async () => {
  if (busy || !current || current.state.game || current.state.turn !== current.seat) return;
  const password = requestFullMoonPassword();
  if (password === null) return;
  busy = true;
  const session = token;
  try {
    const next = await send('full-moon',{password,version:current.version});
    if (session === token) render(next);
  } catch(error) {
    if (session === token) $('match-status').textContent = error.message;
  } finally { if (session === token) busy = false; }
};

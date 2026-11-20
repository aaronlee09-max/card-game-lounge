(async()=>{
await window.LoungeI18n?.ready;
const root=document.querySelector('[data-board-game]');if(!root)return;
const game=root.dataset.boardGame,isBoard=BoardRules.games.includes(game),offline=location.protocol==='file:'||root.dataset.offline==='true';
const $=id=>document.getElementById(id),t=(key,vars)=>window.LoungeI18n?.t(key,vars)||key;
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(label,fn,disabled=false,cls='game-button')=>{const b=node('button',label,cls);b.type='button';b.disabled=disabled;b.onclick=fn;return b};
const templateKeys=Object.keys(window.LOUNGE_GAME_HELP||{});
let state,chess,mode='solo',seat=0,hand=[],draft=[],selected=new Set(),hiddenHand=false,botTimer,closeTimer,clockTimer,selectedSquare=null,dominoSelected=null,online=null,pollTimer,busy=false,generation=0;
const faces=['☀','☾','★','♜','♞','♦','♣','♥','♠','✿','⚓','♫','⚑','☂','⚡'];
const colour=['#b92743','#1767aa','#b66b00','#17212d','#783ca0'];
const fruitSVG=(fruit)=>{
 const shapes=[
  '<path d="M9 12C5 39 24 59 46 45Q55 39 53 29C40 44 21 36 17 13Z" fill="#f3c448" stroke="#b18721" stroke-width="2"/><path d="M9 12L10 7L17 8L17 13M46 45L51 45" fill="none" stroke="#6b633a" stroke-width="4"/>',
  '<path d="M8 24Q30 12 52 24Q48 42 30 55Q12 42 8 24" fill="#ed5369" stroke="#b73351" stroke-width="2"/><path d="M30 21L13 13L18 24L7 27L24 29L30 36L36 28L53 27L43 22L47 13Z" fill="#397d58"/><g fill="#ffe5a1"><ellipse cx="20" cy="34" rx="1.5" ry="2"/><ellipse cx="39" cy="34" rx="1.5" ry="2"/><ellipse cx="25" cy="43" rx="1.5" ry="2"/><ellipse cx="34" cy="44" rx="1.5" ry="2"/></g>',
  '<path d="M30 17C9 1 0 29 13 44Q30 62 47 44C60 29 51 1 30 17" fill="#88b948" stroke="#5e8930" stroke-width="2"/><path d="M29 16L31 7M32 12Q34 2 44 7Q41 17 32 12" fill="#397d58" stroke="#397d58" stroke-width="3"/>',
  '<path d="M28 15L31 5M30 10Q43 2 48 12Q40 19 30 10" fill="#397d58" stroke="#397d58" stroke-width="3"/><g fill="#a37bdf" stroke="#7652ad" stroke-width="2"><circle cx="22" cy="23" r="9"/><circle cx="39" cy="23" r="9"/><circle cx="15" cy="36" r="9"/><circle cx="31" cy="36" r="9"/><circle cx="46" cy="36" r="9"/><circle cx="23" cy="48" r="9"/><circle cx="39" cy="48" r="9"/><circle cx="31" cy="55" r="5"/></g>'
 ];return '<svg viewBox="0 0 60 62" aria-hidden="true">'+shapes[fruit]+'</svg>';
};
const names=()=>Array.from({length:isBoard?state.names.length:game==='domino'?state.hands.length:2},(_,i)=>t('플레이어 {n}',{n:i+1})+(mode==='ai'&&i===1?' · AI':''));
const currentTurn=()=>game==='chess'?(chess.isGameOver()?-1:chess.turn()==='w'?0:1):state?.turn??0;
function setStatus(text){$('board-status').textContent=text}
function clearTimers(){clearTimeout(botTimer);clearTimeout(closeTimer);clearInterval(clockTimer);clearInterval(pollTimer)}
function selectField(id,key,options,value){const l=node('label',t(key));const s=node('select');s.id=id;for(const [v,label]of options){const o=node('option',t(label));o.value=v;s.append(o)}s.value=value;l.append(s);return l}
function lobby(preserve=false){
 const saved={};if(preserve)for(const id of ['play-mode','play-count','play-rule','play-level'])if($(id))saved[id]=$(id).value;
 $('board-lobby').hidden=false;$('board-play').hidden=true;const panel=$('board-modes');panel.replaceChildren();
 const modes=game==='memory'?[['solo','혼자 플레이']]:game==='jenga'?[['solo','혼자 플레이'],['ai','AI 대전'],['local','로컬 대전']]:[['ai','AI 대전'],['local','로컬 대전']];
 panel.append(selectField('play-mode','게임 모드',modes,modes[0][0]));
 if(['rummikub','jenga','halli-galli','domino'].includes(game)){panel.append(selectField('play-count','인원',[['2','2'],['3','3'],['4','4']],'2'));const updateCount=()=>{$('play-count').disabled=$('play-mode').value!=='local'};$('play-mode').onchange=updateCount;updateCount()}
 if(game==='gomoku')panel.append(selectField('play-rule','게임 모드',[['free','자유 규칙'],['renju','금수 규칙']],'free'));
 if(['chess','memory'].includes(game))panel.append(selectField('play-level','난이도',[['easy','쉬움'],['normal','보통'],['hard','어려움']],'normal'));
 const start=button(t('시작'),()=>startGame($('play-mode').value),false,'game-button primary');start.id='game-start';panel.append(start);
 if(isBoard&&!offline){const onlinePanel=node('div',undefined,'online-modes');onlinePanel.append(node('span',t('온라인 2인')),button(t('친구 초대'),()=>startOnline('invite')),button(t('매칭'),()=>startOnline('queue')));panel.append(onlinePanel)}
 const room=new URLSearchParams(location.search).get('room');if(isBoard&&room&&!offline)panel.append(button(t('친구 초대'),()=>startOnline('join',room),false,'game-button primary'));
 for(const [id,value]of Object.entries(saved))if($(id))$(id).value=value;$('play-mode').onchange?.();setStatus('');
}
async function stopOnline(){if(online){const old=online;online=null;fetch('https://royal-room-nov12-e295.mutedwand2.chatgpt.site/api/board/leave',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:old.token,game}),keepalive:true}).catch(()=>{})}}
function startGame(m){
 clearTimers();stopOnline();generation++;mode=m;hiddenHand=false;seat=0;hand=[];selected.clear();selectedSquare=null;dominoSelected=null;
 const count=m==='solo'?1:m==='ai'?2:Number($('play-count')?.value||2);
 if(isBoard){state=BoardRules.create(game,'플레이어 1',count);state.names=Array.from({length:count},(_,i)=>'플레이어 '+(i+1));draft=structuredClone(state.sets||[])}
 else if(game==='chess'){chess=new Chess();state={scores:[0,0]}}
 else if(game==='gomoku')state=LoungeRules.gomoku($('play-rule').value==='renju');
 else if(game==='domino')state=LoungeRules.domino(count);
 else state=LoungeRules.memory($('play-level').value);
 $('board-lobby').hidden=true;$('board-play').hidden=false;$('board-invite').hidden=true;render();scheduleBot();
 if(game==='memory')clockTimer=setInterval(updateClock,100);
}
function boardState(){if(online)return state;const turn=state.turn<0?0:mode==='local'?state.turn:0;const v=BoardRules.view(state,turn);seat=turn;hand=v.hand;return v.state}
function render(){
 if(!state)return;const table=$('board-table');table.replaceChildren();
 const turn=currentTurn(),who=names();let message='';if(game==='chess'&&chess.isCheckmate())state.scores[chess.turn()==='w'?1:0]=1;
 if(game==='memory'){message=state.ended!==null?t('완료!'):t('카드 짝 맞추기')}
 else if(game==='chess')message=chess.isCheckmate()?t('체크메이트')+' · '+t('{name} 승리!',{name:who[chess.turn()==='w'?1:0]}):chess.isStalemate()?t('스테일메이트'):chess.isDraw()?t('무승부'):t('{name} 차례',{name:who[turn]})+(chess.inCheck()?' · '+t('체크'):'');
 else if(turn<0)message=state.message==='탑이 무너졌어요!'?t(state.message):state.winner===null?t('무승부'):t('{name} 승리!',{name:who[state.winner]});
 else message=t('{name} 차례',{name:who[turn]});
 setStatus(message);
 $('board-score').textContent=game==='memory'?'':who.map((n,i)=>n+' · '+t('점수')+' '+(state.scores?.[i]||0)).join(' / ');
 const active=turn>=0&&(mode!=='ai'||turn===0)&&(!online||turn===seat);
 if(hiddenHand){table.append(node('p',t('기기를 다음 플레이어에게 넘겨주세요.')),button(t('준비됐어요'),()=>{hiddenHand=false;render()},false,'game-button primary'));return}
 if(game==='rummikub')renderRummy(table,boardState(),active);
 else if(game==='jenga')renderJenga(table,boardState(),active);
 else if(game==='halli-galli')renderHalli(table,boardState(),turn>=0);
 else if(game==='chess')renderChess(table,active);
 else if(game==='gomoku')renderGomoku(table,active);
 else if(game==='domino')renderDomino(table,active);
 else renderMemory(table);
}
function play(data){
 if(!state||busy)return false;const before=currentTurn();let okay=false;
 if(online){onlineMove(data);return true}
 if(before<0&&game!=='memory')return false;
 if(mode==='ai'&&before!==0&&!(game==='halli-galli'&&data.action==='bell'))return false;
 if(isBoard)okay=BoardRules.move(state,data.seat??before,data);
 else if(game==='gomoku')okay=LoungeRules.gomokuMove(state,data.at);
 else if(game==='domino')okay=LoungeRules.dominoMove(state,before,data);
 if(!okay){setStatus(t(game==='gomoku'&&state.forbidden?'금수입니다. 다른 곳을 선택하세요.':'규칙에 맞지 않는 동작입니다.'));return false}
 afterMove(before);return true;
}
function afterMove(before){
 if(isBoard)draft=structuredClone(state.sets||[]);selected.clear();dominoSelected=null;
 hiddenHand=mode==='local'&&['rummikub','domino'].includes(game)&&currentTurn()>=0&&before!==currentTurn();
 render();scheduleBot();
}
function scheduleBot(){clearTimeout(botTimer);if(mode!=='ai'||online||!state||currentTurn()<0)return;
 const ring=game==='halli-galli'&&BoardRules.five(state);
 if(currentTurn()!==1&&!ring)return;
 const version=generation;botTimer=setTimeout(()=>{
  if(generation!==version||mode!=='ai')return;const before=currentTurn();
  if(isBoard){const move=BoardRules.bot(state,1);if(!BoardRules.move(state,1,move))return;}
  else if(game==='chess'){const move=LoungeRules.chessBot(chess,$('play-level').value==='easy'?1:$('play-level').value==='hard'?3:2);if(move)chess.move(move)}
  else if(game==='gomoku')LoungeRules.gomokuMove(state,LoungeRules.gomokuBot(state));
  else if(game==='domino'){const legal=LoungeRules.dominoOptions(state);const move=legal.sort((a,b)=>(state.tiles[b.id].a+state.tiles[b.id].b)-(state.tiles[a.id].a+state.tiles[a.id].b))[0]||{action:state.stock.length?'draw':'pass'};LoungeRules.dominoMove(state,1,move)}
  afterMove(before);
 },ring?900:600);
}
function renderRummy(table,s,active){
 const controls=node('div',undefined,'game-controls'),rack=node('div',undefined,'rummy-rack'),sets=node('div',undefined,'rummy-sets');
 const tile=id=>{const value=s.tiles[id];const b=button(value.n?String(value.n):'★',()=>{selected.has(id)?selected.delete(id):selected.add(id);render()},!active,'rummy-tile');b.style.color=colour[value.c];b.dataset.tile=id;b.setAttribute('aria-pressed',String(selected.has(id)));b.setAttribute('aria-label',(value.c+1)+' · '+(value.n||'★'));if(selected.has(id))b.classList.add('selected');return b};
 const moved=target=>{
  if(!selected.size)return;
  const old=new Set(s.sets.flat());if(!s.opened[seat]&&[...selected].some(id=>old.has(id))){setStatus(t('규칙에 맞지 않는 동작입니다.'));return}
  const ids=[...selected],next=draft.map(g=>g.filter(id=>!selected.has(id)));
  if(target==='new')next.push(ids);else if(target==='rack'){if(ids.some(id=>!hand.includes(id))){setStatus(t('규칙에 맞지 않는 동작입니다.'));return}}else next[target].push(...ids);
  draft=next.filter(g=>g.length);selected.clear();render();
 };
 draft.forEach((g,i)=>{const group=node('section',undefined,'rummy-set');group.dataset.group=i;group.classList.toggle('invalid',!BoardRules.setValue(g,s.tiles));group.append(node('span',String(i+1),'group-number'));g.forEach(id=>group.append(tile(id)));group.append(button(t('묶음에 추가'),()=>moved(i),!active||!selected.size));sets.append(group)});
 const used=new Set(draft.flat());hand.filter(id=>!used.has(id)).sort((a,b)=>s.tiles[a].c-s.tiles[b].c||s.tiles[a].n-s.tiles[b].n).forEach(id=>rack.append(tile(id)));
 controls.append(button(t('새 묶음'),()=>moved('new'),!active||!selected.size),button(t('랙으로 이동'),()=>moved('rack'),!active||!selected.size),button(t('등록'),()=>play({action:'meld',sets:draft}),!active),button(t('되돌리기'),()=>{draft=structuredClone(s.sets);selected.clear();render()},!active),button(t('뽑기'),()=>play({action:'draw'}),!active));
 table.append(node('p',t('남은 타일')+' '+s.remaining+' · '+s.handCounts.join(' / '),'subtle'),sets,node('h3',t('남은 타일')+' · '+hand.length),rack,controls);
}
function renderJenga(table,s,active){
 const tower=node('div',undefined,'jenga-tower'),highest=s.layers.findLastIndex(l=>l.every(x=>x!==null));tower.classList.toggle('fallen',s.turn<0);
 for(let row=s.layers.length-1;row>=0;row--){const layer=node('div',undefined,'jenga-layer'+(row%2?' cross':''));s.layers[row].forEach((id,slot)=>{
  const b=button(id===null?'':String(row+1),()=>play({action:'pull',row,slot}),!active||id===null||row>=highest||s.held!==null,'wood-block');b.dataset.block=row+':'+slot;b.setAttribute('aria-label',`${row+1} · ${slot+1}`);
  let start=null,dragged=false;b.onpointerdown=e=>{if(b.disabled)return;start=e.clientX;dragged=false;b.setPointerCapture(e.pointerId)};
  b.onpointermove=e=>{if(start!==null){const delta=Math.max(-90,Math.min(90,e.clientX-start));b.style.transform='translateX('+delta+'px)';if(Math.abs(delta)>60)dragged=true}};
  b.onpointerup=()=>{if(start===null)return;start=null;b.style.transform='';if(dragged){b.onclick=null;play({action:'pull',row,slot})}};b.onpointercancel=()=>{start=null;b.style.transform=''};layer.append(b)});tower.append(layer)}
 table.append(node('p',t('블록을 골라 빼고 맨 위에 쌓으세요.')),tower);
 if(s.held!==null&&s.turn>=0){const top=s.layers.at(-1).every(x=>x!==null)?[null,null,null]:s.layers.at(-1),controls=node('div',undefined,'game-controls');top.forEach((id,i)=>controls.append(button(t(['왼쪽','가운데','오른쪽'][i]),()=>play({action:'place',slot:i}),!active||id!==null)));table.append(controls)}
}
function renderHalli(table,s,active){
 const cards=node('div',undefined,'fruit-cards');s.piles.forEach((pile,i)=>{const card=node('section',undefined,'fruit-card');card.append(node('p',names()[i]),node('p',t('남은 카드')+' '+s.handCounts[i]));const face=node('div',undefined,'fruit-face');const top=pile.at(-1);if(top){face.setAttribute('aria-label',(top.fruit+1)+' · '+top.n);for(let n=0;n<top.n;n++){const f=node('span');f.innerHTML=fruitSVG(top.fruit);face.append(f)}}else face.append(node('span','✦'));card.append(face);cards.append(card)});
 const controls=node('div',undefined,'game-controls');controls.append(button(t('카드 뒤집기'),()=>play({action:'flip'}),!active||s.turn!==seat&&mode!=='local'||mode==='ai'&&s.turn!==0));
 const seats=mode==='local'?s.names.map((_,i)=>i):[online?seat:0];for(const i of seats){const bell=button(t('종')+' · '+names()[i],()=>{},!active,'bell');bell.dataset.bell=i;const ring=e=>{if(e){e.preventDefault();if(e.repeat)return}if(!bell.disabled)play({action:'bell',seat:i})};bell.onpointerdown=ring;bell.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')ring(e)};controls.append(bell)}
 table.append(cards,controls);if(s.reaction!==null)table.append(node('p',t('반응 시간')+' '+s.reaction+' ms'));if(s.penalty!==null)table.append(node('p',t('오답 페널티')+' · '+names()[s.penalty]));
}
function renderChess(table,active){
 const wrap=node('div',undefined,'chess-board');wrap.setAttribute('role','group');wrap.setAttribute('aria-label',t('체스'));const symbols={wk:'♔',wq:'♕',wr:'♖',wb:'♗',wn:'♘',wp:'♙',bk:'♚',bq:'♛',br:'♜',bb:'♝',bn:'♞',bp:'♟'};
 const legal=selectedSquare?chess.moves({square:selectedSquare,verbose:true}):[];
 chess.board().forEach((row,r)=>row.forEach((piece,c)=>{const square='abcdefgh'[c]+(8-r);const b=button(piece?symbols[piece.color+piece.type]:'',()=>{
  if(piece?.color===chess.turn()){selectedSquare=selectedSquare===square?null:square;render();return}
  if(!selectedSquare)return;const moves=chess.moves({square:selectedSquare,verbose:true}).filter(m=>m.to===square);if(!moves.length){setStatus(t('규칙에 맞지 않는 동작입니다.'));return}
  if(moves.some(m=>m.promotion)){const promotion=node('div',undefined,'promotion');promotion.append(node('span',t('승격')));for(const p of ['q','r','b','n'])promotion.append(button(symbols[chess.turn()+p],()=>chessMove({from:selectedSquare,to:square,promotion:p})));table.append(promotion);return}
  chessMove({from:selectedSquare,to:square});
 },!active,'chess-square '+((r+c)%2?'dark':'light')+(piece?' piece-'+piece.color:''));b.dataset.square=square;b.setAttribute('aria-label',square+(piece?' '+symbols[piece.color+piece.type]:''));b.classList.toggle('selected',square===selectedSquare);b.classList.toggle('legal',legal.some(m=>m.to===square));if(c===0)b.dataset.rank=8-r;if(r===7)b.dataset.file='abcdefgh'[c];wrap.append(b)}));table.append(wrap);
}
function chessMove(move){try{chess.move(move);selectedSquare=null;render();scheduleBot()}catch{setStatus(t('규칙에 맞지 않는 동작입니다.'))}}
function renderGomoku(table,active){const board=node('div',undefined,'gomoku-board');board.setAttribute('role','group');board.setAttribute('aria-label',t('오목'));for(let i=0;i<225;i++){const b=button('',()=>play({at:i}),!active||!!state.board[i],'go-cell');b.dataset.at=i;b.setAttribute('aria-label',String(Math.floor(i/15)+1)+' · '+(i%15+1));if(state.board[i]){b.classList.add(state.board[i]===1?'black':'white');if(i===state.last)b.classList.add('last')}board.append(b)}table.append(board);if(state.forbidden)table.append(node('p',t('금수: 흑의 장목·33·44'),'subtle'))}
function dominoTile(id,fn,disabled=false,display){const value=display||state.tiles[id];const b=button('',fn,disabled,'domino-tile');for(const n of [value.a,value.b]){const half=node('span',String(n));half.dataset.pips=n;b.append(half)}b.setAttribute('aria-label',value.a+' · '+value.b);return b}
function renderDomino(table,active){
 const chain=node('div',undefined,'domino-chain');state.chain.forEach(v=>chain.append(dominoTile(v.id,()=>{},true,v)));table.append(chain,node('p',t('남은 타일')+' '+state.stock.length+' · '+state.hands.map(h=>h.length).join(' / '),'subtle'));
 const rack=node('div',undefined,'domino-rack'),who=mode==='local'&&state.turn>=0?state.turn:0;
 state.hands[who].forEach(id=>{const b=dominoTile(id,()=>{dominoSelected=dominoSelected===id?null:id;render()},!active);b.dataset.domino=id;b.classList.toggle('selected',id===dominoSelected);rack.append(b)});table.append(rack);
 const controls=node('div',undefined,'game-controls');if(dominoSelected!==null){table.append(node('p',t('보드 양끝 중 연결할 곳을 선택하세요.')));for(const [end,label]of [['left','왼쪽'],['right','오른쪽']])controls.append(button(t(label),()=>play({action:'play',id:dominoSelected,end}),!active||!LoungeRules.dominoLegal(state,dominoSelected,end)))}
 const canPlay=LoungeRules.dominoOptions(state).length>0;controls.append(button(t('뽑기'),()=>play({action:'draw'}),!active||canPlay||!state.stock.length),button(t('차례 넘기기'),()=>play({action:'pass'}),!active||canPlay||!!state.stock.length));table.append(controls);
}
function bestKey(){return 'lounge-memory-best-v1:'+state.level}
function readBest(){try{const n=Number(localStorage.getItem(bestKey()));return n>0?n:null}catch{return null}}
function renderMemory(table){
 const stats=node('p');stats.id='memory-stats';table.append(stats);const board=node('div',undefined,'memory-board');board.style.setProperty('--columns',state.cards.length===12?4:state.cards.length===20?5:6);
 state.cards.forEach((value,i)=>{const open=state.open.includes(i)||state.matched.includes(i);const b=button(open?faces[value]:'✦',()=>{
  if(!LoungeRules.memoryFlip(state,i,performance.now()))return;
  if(state.ended!==null){const elapsed=Math.max(1,Math.round(state.ended-state.started));const best=readBest();if(!best||elapsed<best){try{localStorage.setItem(bestKey(),String(elapsed))}catch{}state.newBest=true}}
  if(state.locked){const current=generation;clearTimeout(closeTimer);closeTimer=setTimeout(()=>{if(current!==generation)return;LoungeRules.memoryClose(state);render()},850)}render();
 },state.locked||state.matched.includes(i)||state.open.includes(i)||state.ended!==null,'memory-card'+(open?' revealed':'')+(state.matched.includes(i)?' matched':''));b.dataset.card=i;b.setAttribute('aria-label',open?faces[value]:t('카드 뒤집기')+' '+(i+1));board.append(b)});table.append(board);updateClock();
}
function updateClock(){if(game!=='memory'||!state)return;const elapsed=state.started===null?0:(state.ended??performance.now())-state.started,best=readBest();const stats=$('memory-stats');if(stats)stats.textContent=t('시간')+' '+(elapsed/1000).toFixed(1)+' s · '+t('시도')+' '+state.attempts+' · '+t('짝')+' '+state.matched.length/2+'/'+state.cards.length/2+' · '+t('최고 기록')+' '+(best?(best/1000).toFixed(1)+' s':'—')+(state.newBest?' · '+t('새 기록!'):'')}
async function request(action,data={}){const r=await fetch('https://royal-room-nov12-e295.mutedwand2.chatgpt.site/api/board/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({game,token:online.token,...data}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('network');return r.json()}
function showOnline(v){if(!online||v.version<online.version)return;const changed=v.version!==online.version;online.version=v.version;state=v.state;seat=v.seat;hand=v.hand||[];if(changed){draft=structuredClone(state.sets||[]);selected.clear()}
 $('board-lobby').hidden=true;$('board-play').hidden=false;
 if(v.waiting){setStatus(t('친구를 기다리는 중'));$('board-table').replaceChildren();$('board-invite').hidden=!v.room;if(v.room){const url=new URL('/'+game+'/', 'https://webtronics.run.place');url.searchParams.set('room',v.room);url.searchParams.set('lang',window.LoungeI18n.language);$('board-invite-url').href=url.href;$('board-invite-url').textContent=url.href;drawInviteQR($('board-qr'),url.href)}return}
 $('board-invite').hidden=true;render();
}
async function startOnline(action,room){clearTimers();await stopOnline();generation++;mode='online';hiddenHand=false;setStatus(t('연결 중'));online={token:crypto.randomUUID(),version:-1};try{showOnline(await request(action,{room,name:t('플레이어 {n}',{n:1})}));pollTimer=setInterval(async()=>{if(busy||!online)return;try{showOnline(await request('state'))}catch{setStatus(t('연결에 실패했습니다. 다시 시도하세요.'))}},1200)}catch{online=null;setStatus(t('연결에 실패했습니다. 다시 시도하세요.'))}}
async function onlineMove(data){if(busy||!online)return;busy=true;try{showOnline(await request('move',{...data,version:online.version}))}catch{setStatus(t('규칙에 맞지 않는 동작입니다.'));try{showOnline(await request('state'))}catch{setStatus(t('연결에 실패했습니다. 다시 시도하세요.'))}}finally{busy=false}}
$('board-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('board-invite-url').href);setStatus(t('복사했어요'))}catch{setStatus($('board-invite-url').href)}};
$('board-back').onclick=()=>{generation++;clearTimers();stopOnline();state=null;lobby()};
$('board-restart').onclick=()=>{if(!online)startGame(mode);else{generation++;clearTimers();stopOnline();state=null;lobby()}};
 document.addEventListener('lounge-language',()=>{if(state)render();else lobby(true)});
 lobby();
})();

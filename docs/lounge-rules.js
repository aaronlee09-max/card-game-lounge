/* Game rules are independent of rendering, storage and network access. */
const LoungeRules=(()=>{
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const dirs=[[1,0],[0,1],[1,1],[1,-1]],inside=(r,c)=>r>=0&&r<15&&c>=0&&c<15;
function lengths(b,at,colour){const r=Math.floor(at/15),c=at%15;return dirs.map(([dr,dc])=>{let n=1;for(const sign of [-1,1])for(let d=1;inside(r+dr*d*sign,c+dc*d*sign)&&b[(r+dr*d*sign)*15+c+dc*d*sign]===colour;d++)n++;return n})}
function fours(b,at){const result=new Set(),r=Math.floor(at/15),c=at%15;
 dirs.forEach(([dr,dc],dir)=>{for(let start=-4;start<=0;start++){const cells=Array.from({length:5},(_,j)=>[r+(start+j)*dr,c+(start+j)*dc]);if(cells.some(([r,c])=>!inside(r,c)))continue;const ids=cells.map(([r,c])=>r*15+c);const own=ids.filter(i=>b[i]===1),empty=ids.filter(i=>!b[i]);if(own.length!==4||empty.length!==1||!own.includes(at))continue;const e=empty[0];b[e]=1;const n=lengths(b,e,1)[dir];b[e]=0;if(n===5)result.add(dir+':'+own.join(','))}});return result;
}
function forbiddenPlaced(b,at,memo=new Map()){
 const key=at+':'+b.join('');if(memo.has(key))return memo.get(key);
 const lens=lengths(b,at,1);if(lens.includes(5))return null;if(lens.some(n=>n>5))return 'overline';if(fours(b,at).size>=2)return 'double-four';
 const threes=new Map(),r=Math.floor(at/15),c=at%15;
 dirs.forEach(([dr,dc],dir)=>{for(let start=-3;start<=0;start++){
  const cells=Array.from({length:6},(_,j)=>[r+(start+j-1)*dr,c+(start+j-1)*dc]);if(cells.some(([r,c])=>!inside(r,c)))continue;
  const ids=cells.map(([r,c])=>r*15+c);if(b[ids[0]]||b[ids[5]])continue;const mid=ids.slice(1,5),own=mid.filter(i=>b[i]===1),empty=mid.filter(i=>!b[i]);if(own.length!==3||empty.length!==1||!own.includes(at))continue;
  const ext=empty[0],group=dir+':'+own.join(',');if(!threes.has(group))threes.set(group,[]);threes.get(group).push(ext);
 }});
 let real=0;
 for(const exts of threes.values()){
  let valid=false;for(const ext of exts){b[ext]=1;const won=lengths(b,ext,1).includes(5);const denied=won||forbiddenPlaced(b,ext,memo);b[ext]=0;if(!denied){valid=true;break}}
  if(valid&&++real>=2){memo.set(key,'double-three');return 'double-three'}
 }
 memo.set(key,null);return null;
}
function forbidden(b,at){if(b[at])return 'occupied';b[at]=1;const result=forbiddenPlaced(b,at);b[at]=0;return result}
function gomoku(rules=false){return {board:Array(225).fill(0),turn:0,winner:null,forbidden:rules,moves:0,last:null,scores:[0,0]}}
function gomokuMove(s,at){if(s.turn<0||!Number.isInteger(at)||at<0||at>224||s.board[at])return false;if(s.forbidden&&s.moves===0&&at!==112)return false;if(s.forbidden&&s.turn===0&&forbidden(s.board,at))return false;const who=s.turn;s.board[at]=who+1;s.last=at;s.moves++;const win=lengths(s.board,at,who+1).some(n=>s.forbidden&&who===0?n===5:n>=5);if(win){s.winner=who;s.scores[who]=1;s.turn=-1}else if(s.moves===225)s.turn=-1;else s.turn=1-who;return true}
function gomokuBot(s){if(!s.moves)return 112;const candidates=[];for(let i=0;i<225;i++)if(!s.board[i]){const r=Math.floor(i/15),c=i%15;let near=false;for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++)if(inside(r+dr,c+dc)&&s.board[(r+dr)*15+c+dc])near=true;if(near)candidates.push(i)}
 let best=-Infinity,pick=candidates[0];for(const at of candidates){if(s.forbidden&&s.turn===0&&forbidden(s.board,at))continue;let scores=[];for(const colour of [s.turn+1,2-s.turn]){s.board[at]=colour;const lens=lengths(s.board,at,colour);scores.push(lens.reduce((v,n)=>v+[0,1,12,110,4500,100000,100000][Math.min(6,n)],0));s.board[at]=0}const v=scores[0]+scores[1]*.95-Math.abs(at%15-7)-Math.abs(Math.floor(at/15)-7);if(v>best){best=v;pick=at}}return pick}
function domino(count=2){count=Math.max(2,Math.min(4,count));const deck=shuffle(Array.from({length:7},(_,a)=>Array.from({length:7-a},(_,j)=>({a,b:a+j}))).flat());const s={tiles:deck,stock:deck.map((_,i)=>i),hands:Array.from({length:count},()=>[]),chain:[],turn:0,scores:Array(count).fill(0),winner:null,passes:0};for(const h of s.hands)h.push(...s.stock.splice(-(count===2?7:5)));return s}
function dominoLegal(s,id,end){const t=s.tiles[id];if(!t)return false;if(!s.chain.length)return true;const n=end==='left'?s.chain[0].a:s.chain.at(-1).b;return t.a===n||t.b===n}
function dominoOptions(s,seat=s.turn){if(seat<0)return [];return s.hands[seat].flatMap(id=>['left','right'].filter(end=>dominoLegal(s,id,end)).map(end=>({action:'play',id,end})))}
function dominoFinish(s,who){s.winner=who;s.turn=-1;const totals=s.hands.map(h=>h.reduce((a,id)=>a+s.tiles[id].a+s.tiles[id].b,0));if(who!==null)s.scores[who]=totals.reduce((a,n,i)=>a+(i===who?0:n),0)}
function dominoMove(s,seat,b){if(s.turn<0||seat!==s.turn)return false;const hand=s.hands[seat];if(b.action==='play'){
 if(!['left','right'].includes(b.end)||!hand.includes(b.id)||!dominoLegal(s,b.id,b.end))return false;
 let {a,b:n}=s.tiles[b.id];if(s.chain.length){const match=b.end==='left'?s.chain[0].a:s.chain.at(-1).b;if(b.end==='left'?n!==match:a!==match)[a,n]=[n,a]}
 const tile={id:b.id,a,b:n};if(b.end==='left')s.chain.unshift(tile);else s.chain.push(tile);hand.splice(hand.indexOf(b.id),1);s.passes=0;if(!hand.length){dominoFinish(s,seat);return true}
 }else if(b.action==='draw'){
 if(dominoOptions(s).length||!s.stock.length)return false;hand.push(s.stock.pop());return true;
 }else if(b.action==='pass'){
 if(dominoOptions(s).length||s.stock.length)return false;s.passes++;if(s.passes>=s.hands.length){const totals=s.hands.map(h=>h.reduce((a,id)=>a+s.tiles[id].a+s.tiles[id].b,0)),min=Math.min(...totals);dominoFinish(s,totals.filter(n=>n===min).length===1?totals.indexOf(min):null);return true}
 }else return false;s.turn=(seat+1)%s.hands.length;return true}
function memory(level='easy'){const count={easy:6,normal:10,hard:15}[level]||6;return {level,cards:shuffle(Array.from({length:count*2},(_,i)=>i%count)),matched:[],open:[],attempts:0,started:null,ended:null,locked:false}}
function memoryFlip(s,i,now){if(s.ended!==null||s.locked||!Number.isInteger(i)||i<0||i>=s.cards.length||s.open.includes(i)||s.matched.includes(i))return false;if(s.started===null)s.started=now;s.open.push(i);if(s.open.length===2){s.attempts++;if(s.cards[s.open[0]]===s.cards[s.open[1]]){s.matched.push(...s.open);s.open=[];if(s.matched.length===s.cards.length)s.ended=now}else s.locked=true}return true}
function memoryClose(s){s.open=[];s.locked=false}
function chessBot(chess,depth=2){
 const values={p:100,n:320,b:330,r:500,q:900,k:0},start=Date.now();
 function evaluation(){if(chess.isCheckmate())return -100000;if(chess.isDraw())return 0;let score=0;chess.board().forEach((row,r)=>row.forEach((p,c)=>{if(p)score+=(p.color===chess.turn()?1:-1)*(values[p.type]+(p.type==='k'?0:3*(7-Math.abs(r-3.5)-Math.abs(c-3.5))))}));return score}
 function search(d,alpha,beta){if(!d||chess.isGameOver()||Date.now()-start>180)return evaluation();let best=-Infinity;const moves=chess.moves({verbose:true}).sort((a,b)=>(values[b.captured]||0)-(values[a.captured]||0));for(const m of moves){chess.move(m);const score=-search(d-1,-beta,-alpha);chess.undo();best=Math.max(best,score);alpha=Math.max(alpha,score);if(alpha>=beta)break}return best}
 let best=-Infinity,pick;for(const move of chess.moves({verbose:true})){chess.move(move);const score=-search(Math.max(0,depth-1),-Infinity,Infinity);chess.undo();if(score>best){best=score;pick=move}}return pick;
}
return {gomoku,gomokuMove,gomokuBot,forbidden,forbiddenPlaced,lengths,domino,dominoMove,dominoLegal,dominoOptions,memory,memoryFlip,memoryClose,chessBot};
})();

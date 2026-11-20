/* Original digital implementations. The server uses the default two-player state. */
const BoardRules=(()=>{
const games=['rummikub','jenga','halli-galli'];
const labels={rummikub:'루미큐브',jenga:'젠가','halli-galli':'할리갈리'};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function create(game,name='플레이어 1',count=2){
 if(!games.includes(game))throw Error('game');count=Math.max(game==='jenga'?1:2,Math.min(4,Number(count)||2));
 const s={game,names:Array.from({length:count},(_,i)=>i===0?name:null),turn:0,scores:Array(count).fill(0),winner:null,message:'',moves:0};
 if(game==='rummikub'){
  const tiles=shuffle(Array.from({length:104},(_,id)=>({id,n:id%13+1,c:Math.floor(id/13)%4})).concat([{id:104,n:0,c:4},{id:105,n:0,c:4}]));
  s.tiles=Object.fromEntries(tiles.map(t=>[t.id,t]));s.deck=tiles.map(t=>t.id);s.hands=Array.from({length:count},()=>s.deck.splice(-14));s.sets=[];s.opened=Array(count).fill(false);s.passes=0;
 }else if(game==='jenga'){s.layers=Array.from({length:18},(_,i)=>[i*3,i*3+1,i*3+2]);s.hands=Array.from({length:count},()=>[]);s.held=null;}
 else {const deck=shuffle(Array.from({length:4},(_,fruit)=>[1,1,1,1,1,2,2,2,3,3,3,4,4,5].map(n=>({fruit,n}))).flat());s.hands=Array.from({length:count},()=>[]);deck.forEach((c,i)=>s.hands[i%count].push(c));s.piles=Array.from({length:count},()=>[]);s.reaction=null;s.penalty=null;s.revealedAt=null;}
 return s;
}
function setValue(ids,tiles){
 if(ids.length<3||ids.length>13||new Set(ids).size!==ids.length)return 0;
 const ts=ids.map(id=>tiles[id]);if(ts.some(t=>!t))return 0;
 const natural=ts.filter(t=>t.n);if(!natural.length)return 0;
 let best=ts.length<=4&&new Set(natural.map(t=>t.n)).size===1&&new Set(natural.map(t=>t.c)).size===natural.length?natural[0].n*ts.length:0;
 if(new Set(natural.map(t=>t.c)).size!==1||new Set(natural.map(t=>t.n)).size!==natural.length)return best;
 const nums=natural.map(t=>t.n).sort((a,b)=>a-b);
 for(let start=Math.min(nums[0],14-ts.length);start>=Math.max(1,nums.at(-1)-ts.length+1);start--)if(nums.every(n=>n>=start&&n<start+ts.length))return Math.max(best,ts.length*(2*start+ts.length-1)/2);
 return best;
}
function five(s){const sums=[0,0,0,0];s.piles.forEach(p=>{const t=p.at(-1);if(t)sums[t.fruit]+=t.n});return sums.includes(5)}
function finish(s,w,message=''){s.winner=w;s.turn=-1;s.message=message;}
function balance(layers){
 for(let i=0;i<layers.length-1;i++){
  const occupied=layers[i].map((b,j)=>b===null?null:j-1).filter(x=>x!==null);if(!occupied.length)return false;
  let mass=0,weighted=0;
  for(let k=i+1;k<layers.length;k++)for(let j=0;j<3;j++)if(layers[k][j]!==null){mass++;weighted+=k%2===i%2?j-1:0;}
  const center=mass?weighted/mass:0;
  if(center<Math.min(...occupied)-.48||center>Math.max(...occupied)+.48)return false;
 }return true;
}
function rummyFinish(s,w){const pts=s.hands.map(h=>h.reduce((a,id)=>a+(s.tiles[id].n||30),0));s.scores=pts.map((n,i)=>i===w?pts.reduce((a,x,j)=>a+(j===w?0:x),0):-n);finish(s,w)}
function halliNext(s,seat){for(let i=1;i<=s.names.length;i++){const n=(seat+i)%s.names.length;if(s.hands[n].length){s.turn=n;return}}const totals=s.piles.map(p=>p.length),max=Math.max(...totals);finish(s,totals.filter(n=>n===max).length===1?totals.indexOf(max):null)}
function move(s,seat,b){
 const count=s.names.length,next=()=>s.turn=(seat+1)%count;
 if(s.turn<0||!Number.isInteger(seat)||seat<0||seat>=count)return false;
 if(s.game==='halli-galli'&&b.action==='bell'){
  if(!s.hands[seat].length&&!s.piles[seat].length)return false;
  if(!s.piles.some(p=>p.length))return false;
  if(five(s)){
   s.reaction=Math.max(0,Date.now()-(s.revealedAt||Date.now()));s.penalty=null;
   s.hands[seat].push(...shuffle(s.piles.flat()));s.piles=Array.from({length:count},()=>[]);s.scores[seat]++;s.turn=seat;s.revealedAt=null;
   if(s.hands.filter(h=>h.length).length===1)finish(s,seat);
  }else {
   const active=s.hands.map((h,i)=>h.length||s.piles[i].length?i:-1).filter(i=>i>=0);s.penalty=seat;
   if(active.length<=2){const other=active.find(i=>i!==seat);finish(s,other??null)}
   else {for(const i of active)if(i!==seat&&s.hands[seat].length)s.hands[i].push(s.hands[seat].shift());if(!s.hands[s.turn].length)halliNext(s,s.turn);}
  }
 }else{
  if(s.turn!==seat)return false;
  if(s.game==='rummikub'){
   if(b.action==='draw'){
    if(s.deck.length){s.hands[seat].push(s.deck.pop());s.passes=0}else s.passes++;
    next();if(s.passes>=count){const pts=s.hands.map(h=>h.reduce((a,id)=>a+(s.tiles[id].n||30),0)),min=Math.min(...pts);rummyFinish(s,pts.filter(n=>n===min).length===1?pts.indexOf(min):null)}
   }else if(b.action==='meld'){
    if(!Array.isArray(b.sets)||b.sets.length>36||b.sets.some(g=>!Array.isArray(g)))return false;
    const flat=b.sets.flat(),old=s.sets.flat(),hand=s.hands[seat];
    if(flat.length>106||new Set(flat).size!==flat.length||flat.some(id=>!Number.isInteger(id)||!old.includes(id)&&!hand.includes(id))||old.some(id=>!flat.includes(id)))return false;
    const used=hand.filter(id=>flat.includes(id));if(!used.length)return false;
    if(b.sets.some(g=>!setValue(g,s.tiles)))return false;
    if(!s.opened[seat]){if(s.sets.some((g,i)=>JSON.stringify(g)!==JSON.stringify(b.sets[i])))return false;const fresh=b.sets.slice(s.sets.length);if(fresh.flat().some(id=>!hand.includes(id))||fresh.reduce((a,g)=>a+setValue(g,s.tiles),0)<30)return false;s.opened[seat]=true;}
    s.sets=b.sets.map(g=>g.slice());s.hands[seat]=hand.filter(id=>!used.includes(id));s.passes=0;next();
    if(!s.hands[seat].length)rummyFinish(s,seat);
   }else return false;
  }else if(s.game==='jenga'){
   if(b.action==='pull'){
    const {row,slot}=b,highest=s.layers.findLastIndex(l=>l.every(x=>x!==null));
    if(s.held!==null||!Number.isInteger(row)||!Number.isInteger(slot)||row<0||row>=highest||slot<0||slot>2||s.layers[row][slot]===null)return false;
    s.held=s.layers[row][slot];s.layers[row][slot]=null;
    if(!balance(s.layers))finish(s,count===1?null:(seat+1)%count,'탑이 무너졌어요!');
   }else if(b.action==='place'){
    if(s.held===null||!Number.isInteger(b.slot)||b.slot<0||b.slot>2)return false;
    const top=s.layers.at(-1);if(!top.every(x=>x!==null)&&top[b.slot]!==null)return false;
    if(top.every(x=>x!==null))s.layers.push([null,null,null]);
    s.layers.at(-1)[b.slot]=s.held;s.held=null;s.moves++;s.scores[seat]++;
    if(!balance(s.layers))finish(s,count===1?null:(seat+1)%count,'탑이 무너졌어요!');else next();
   }else return false;
  }else if(s.game==='halli-galli'){
   if(b.action!=='flip'||!s.hands[seat].length)return false;
   s.piles[seat].push(s.hands[seat].shift());s.penalty=null;s.revealedAt=five(s)?Date.now():null;halliNext(s,seat);
   // Keep the last visible five claimable, even if every draw pile is empty.
   if(s.turn<0&&five(s)){s.turn=seat;s.winner=null;}
  }else return false;
 }
 return true;
}
function view(s,seat){const {deck,hands,...v}=s;v.handCounts=hands.map(h=>h.length);if(s.game==='rummikub'){const shown=new Set([...s.sets.flat(),...hands[seat]]);v.tiles=Object.fromEntries(Object.entries(s.tiles).filter(([id])=>shown.has(Number(id))));v.remaining=deck.length;}
 if(s.game==='halli-galli')v.piles=s.piles.map(p=>p.length?[p.at(-1)]:[]);return {state:v,hand:s.game==='rummikub'?hands[seat]:[]};}
function bot(s,seat){
 if(s.game==='halli-galli')return five(s)?{action:'bell'}:{action:'flip'};
 if(s.game==='jenga'){
  if(s.held!==null){const top=s.layers.at(-1);return {action:'place',slot:[1,0,2].find(i=>top.every(x=>x!==null)||top[i]===null)}}
  const highest=s.layers.findLastIndex(l=>l.every(x=>x!==null)),options=[];
  for(let row=0;row<highest;row++)for(let slot=0;slot<3;slot++)if(s.layers[row][slot]!==null){const l=structuredClone(s.layers);l[row][slot]=null;if(balance(l))options.push({action:'pull',row,slot})}
  return options[Math.floor(Math.random()*options.length)]||{action:'pull',row:0,slot:s.layers[0].findIndex(x=>x!==null)};
 }
 let remaining=s.hands[seat].slice();const sets=[];
 while(true){const candidates=[],jokers=remaining.filter(id=>!s.tiles[id].n);
  for(let n=1;n<=13;n++){const group=[];for(let c=0;c<4;c++){const id=remaining.find(id=>s.tiles[id].n===n&&s.tiles[id].c===c);if(id!==undefined)group.push(id)}if(group.length&&group.length+jokers.length>=3)candidates.push([...group,...jokers.slice(0,Math.min(4-group.length,Math.max(0,3-group.length)))])}
  for(let c=0;c<4;c++)for(let start=1;start<=11;start++)for(let len=3;start+len<=14;len++){const group=[],missing=[];for(let n=start;n<start+len;n++){const id=remaining.find(id=>s.tiles[id].c===c&&s.tiles[id].n===n);if(id===undefined)missing.push(n);else group.push(id)}if(group.length&&missing.length<=jokers.length)candidates.push([...group,...jokers.slice(0,missing.length)])}
  candidates.sort((a,b)=>b.length-a.length||setValue(b,s.tiles)-setValue(a,s.tiles));const group=candidates.find(g=>setValue(g,s.tiles));if(!group)break;sets.push(group);remaining=remaining.filter(id=>!group.includes(id));
 }
 if(sets.length&&(s.opened[seat]||sets.reduce((a,g)=>a+setValue(g,s.tiles),0)>=30))return {action:'meld',sets:[...s.sets,...sets]};
 if(s.opened[seat])for(const id of remaining)for(let i=0;i<s.sets.length;i++){const melds=s.sets.map(g=>g.slice());melds[i].push(id);if(setValue(melds[i],s.tiles))return {action:'meld',sets:melds}};
 return {action:'draw'};
}
return {games,labels,create,move,view,setValue,five,balance,bot};
})();

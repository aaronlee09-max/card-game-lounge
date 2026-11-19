const duelColors = ['red','blue','green','yellow'];
const duelColorNames = {red:'빨강',blue:'파랑',green:'초록',yellow:'노랑',wild:'와일드'};

function duelShuffle(cards) {
  for (let i=cards.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [cards[i],cards[j]]=[cards[j],cards[i]];
  }
  return cards;
}

function newDuel(game,name) {
  const base={game,names:[name,null],scores:[0,0],turn:0};
  if (game==='uno') {
    const numbers=[1,2,3,4,5,6,7,8,9,'건너뛰기','역방향','+2'];
    const deck=duelShuffle([
      ...duelColors.flatMap(color=>[0,...numbers,...numbers].map(value=>({color,value}))),
      ...Array.from({length:4},()=>[{color:'wild',value:'색 변경'},{color:'wild',value:'+4'}]).flat()
    ]);
    const hands=[deck.splice(-7),deck.splice(-7)];
    const discard=deck.splice(deck.findIndex(card=>typeof card.value==='number'),1);
    return {...base,deck,hands,discard,color:discard[0].color,drew:false};
  }
  const deck=duelShuffle(['♠','♥','♦','♣'].flatMap(suit=>Array.from({length:13},(_,i)=>({suit,rank:i+1}))));
  const hand=()=>[deck.pop(),deck.pop()];
  const state={...base,deck,hands:[hand(),hand()],dealer:hand(),stakes:[10,10],outcomes:[]};
  // Preserve seat zero until the second player has joined the room.
  return state;
}

function unoHandPoints(hand) {
  return hand.reduce((sum,card)=>sum+(typeof card.value==='number'?card.value:card.color==='wild'?50:20),0);
}

function unoCanPlay(state,seat,card) {
  if (!card) return false;
  if (card.value==='+4') return !state.hands[seat].some(item=>item.color===state.color);
  return card.color==='wild'||card.color===state.color||card.value===state.discard.at(-1).value;
}

function unoDraw(state,seat,count) {
  const before=state.hands[seat].length;
  for(let i=0;i<count;i++){
    if(!state.deck.length&&state.discard.length>1) state.deck=duelShuffle(state.discard.splice(0,state.discard.length-1));
    if(state.deck.length) state.hands[seat].push(state.deck.pop());
  }
  return state.hands[seat].length>before;
}

function duelValue(cards) {
  let total=cards.reduce((sum,card)=>sum+Math.min(card.rank,10),0);
  if(total<=11&&cards.some(card=>card.rank===1)) total+=10;
  return total;
}

function settleDuelBJ(state) {
  if(state.hands.some(hand=>duelValue(hand)<=21)) {
    while(duelValue(state.dealer)<17) state.dealer.push(state.deck.pop());
  }
  const dealer=duelValue(state.dealer);
  const naturalB=state.dealer.length===2&&dealer===21;
  state.outcomes=state.hands.map((hand,seat)=>{
    const value=duelValue(hand), natural=hand.length===2&&value===21, stake=state.stakes[seat];
    if(value>21) {state.scores[seat]=-stake;return '버스트';}
    if(natural&&naturalB) return '무승부';
    if(natural) {state.scores[seat]=stake*1.5;return '블랙잭';}
    if(naturalB) {state.scores[seat]=-stake;return '딜러 블랙잭';}
    if(dealer===value) return '무승부';
    if(dealer>21||value>dealer) {state.scores[seat]=stake;return '딜러에게 승리';}
    state.scores[seat]=-stake;return '딜러에게 패배';
  });
  state.turn=-1;
}

function startDuelBJ(state) {
  if(duelValue(state.dealer)===21) settleDuelBJ(state);
  else if(duelValue(state.hands[0])===21) advanceDuelBJ(state,0);
}

function advanceDuelBJ(state,seat) {
  if(seat===0&&duelValue(state.hands[1])!==21) state.turn=1;
  else settleDuelBJ(state);
}

function duelAction(state,seat,{action,slot,color}) {
  if(state.turn!==seat) return false;
  if(state.game==='blackjack') {
    if(!['hit','stand','double'].includes(action)) return false;
    const hand=state.hands[seat];
    if(action==='double'&&hand.length!==2) return false;
    if(action==='double') state.stakes[seat]*=2;
    if(action!=='stand') hand.push(state.deck.pop());
    if(action!=='hit'||duelValue(hand)>=21) advanceDuelBJ(state,seat);
    return true;
  }
  const hand=state.hands[seat];
  if(action==='draw'&&!state.drew) {
    state.drew=unoDraw(state,seat,1);
    if(!state.drew) state.turn=1-seat;
    return true;
  }
  if(action==='pass'&&state.drew) {
    state.drew=false;state.turn=1-seat;return true;
  }
  if(action!=='play'||!Number.isInteger(slot)||!unoCanPlay(state,seat,hand[slot])||
    (state.drew&&slot!==hand.length-1)) return false;
  const card=hand[slot];
  if(card.color==='wild'&&!duelColors.includes(color)) return false;
  hand.splice(slot,1);
  state.discard.push(card);
  state.color=card.color==='wild'?color:card.color;
  state.drew=false;
  if(card.value==='+2'||card.value==='+4') unoDraw(state,1-seat,Number(card.value[1]));
  if(!hand.length) {
    state.winner=seat;
    state.scores[seat]=unoHandPoints(state.hands[1-seat]);
    state.turn=-1;
    return true;
  }
  if(!['+2','+4','건너뛰기','역방향'].includes(card.value)) state.turn=1-seat;
  return true;
}

function duelView(state,seat) {
  const {deck,hands,discard,dealer,...view}=state;
  view.handCounts=hands.map(hand=>hand.length);
  if(state.game==='uno') view.top=discard.at(-1);
  else {
    view.dealer=state.turn<0&&state.resigned===undefined?dealer:[dealer[0]];
    if(state.turn<0&&state.resigned===undefined) view.finalHands=hands;
  }
  return {state:view,hand:hands[seat]};
}

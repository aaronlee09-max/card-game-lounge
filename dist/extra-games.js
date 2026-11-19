const table = document.querySelector('#game-table');
const gameStatus = document.querySelector('#game-message');

function element(tag, label, className) {
  const node = document.createElement(tag);
  if (label) node.textContent = label;
  if (className) node.className = className;
  return node;
}

function action(label, callback, disabled = false, className = 'primary') {
  const button = element('button', label, className);
  button.disabled = disabled;
  button.onclick = callback;
  return button;
}

function shuffled(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i],cards[j]] = [cards[j],cards[i]];
  }
  return cards;
}

function uno() {
  const colors = ['red','blue','green','yellow'];
  const colorNames = {red:'빨강',blue:'파랑',green:'초록',yellow:'노랑',wild:'와일드'};
  let deck, discard, hands, activeColor, turn, drew, choice, timer, message;
  let totals=[0,0];
  function reset() {
    clearTimeout(timer);
    const colored = colors.flatMap(color => [0,...[1,2,3,4,5,6,7,8,9,'건너뛰기','역방향','+2'].flatMap(value => [value,value])].map(value=>({color,value})));
    deck = shuffled([...colored,...Array.from({length:4},()=>[{color:'wild',value:'색 변경'},{color:'wild',value:'+4'}]).flat()]);
    hands = [deck.splice(-7),deck.splice(-7)];
    discard = deck.splice(deck.findIndex(card=>typeof card.value === 'number'),1);
    activeColor = discard[0].color;
    turn = 0;
    drew = false;
    choice = null;
    message = '같은 색이나 같은 숫자·기호의 카드를 내세요.';
    render();
  }
  function draw(seat,count) {
    for (let i=0;i<count;i++) {
      if (!deck.length && discard.length>1) deck=shuffled(discard.splice(0,discard.length-1));
      if (deck.length) hands[seat].push(deck.pop());
    }
  }
  function legal(seat,card) {
    if (card.value === '+4') return !hands[seat].some(item=>item.color===activeColor);
    return card.color === 'wild' || card.color === activeColor || card.value === discard.at(-1).value;
  }
  function advance(seat) {
    turn = seat;
    drew = false;
    render();
    if (turn === 1) timer=setTimeout(bot,500);
  }
  function play(seat,index,color) {
    if (turn!==seat) return;
    const card=hands[seat][index];
    if (!card || !legal(seat,card)) return;
    hands[seat].splice(index,1);
    discard.push(card);
    activeColor=color || card.color;
    choice=null;
    const name=seat===0?'나':'봇';
    message=name+' · '+card.value+(hands[seat].length===1?' · 우노!':'');
    const penalty=card.value==='+2'||card.value==='+4';
    if (penalty) draw(1-seat,Number(card.value[1]));
    if (!hands[seat].length) {
      turn=-1;
      const points=unoHandPoints(hands[1-seat]);
      totals[seat]+=points;
      message=(seat===0?'내가':'봇이')+' 카드를 모두 냈어요. '+name+' +'+points+'점';
      if (totals[seat]>=500) message += ' · 500점 대전 승리!';
      render();
      return;
    }
    if (penalty) advance(seat);
    else advance(['건너뛰기','역방향'].includes(card.value)?seat:1-seat);
  }
  function bot() {
    if (turn!==1) return;
    let index=hands[1].findIndex(card=>legal(1,card));
    if (index<0) {
      const before=hands[1].length;
      draw(1,1);
      if(hands[1].length>before && legal(1,hands[1].at(-1))) index=hands[1].length-1;
    }
    if(index<0) {
      message='봇이 차례를 넘겼어요.';
      advance(0);
      return;
    }
    const card=hands[1][index];
    const favorite=[...colors].sort((a,b)=>hands[1].filter(item=>item.color===b).length-hands[1].filter(item=>item.color===a).length)[0];
    play(1,index,card.color==='wild'?favorite:undefined);
  }
  function cardNode(card,callback,disabled) {
    const label=colorNames[card.color]+' '+card.value;
    const node=callback?action(label,callback,disabled,'playing-card uno-card'):element('span',label,'playing-card uno-card');
    drawUnoCard(node,card,label);
    return node;
  }
  function render() {
    gameStatus.textContent=message;
    const top=element('div',null,'card-row');
    top.append(cardNode(discard.at(-1)));
    const hand=element('div',null,'card-row');
    hands[0].forEach((card,i)=>hand.append(cardNode(card,()=>{
      if(card.color==='wild') { choice=i; render(); } else play(0,i);
    },turn!==0 || choice!==null || !legal(0,card) || (drew && i!==hands[0].length-1))));
    const controls=element('div',null,'game-controls');
    if(choice!==null) {
      for(const color of colors) controls.append(action(colorNames[color],()=>play(0,choice,color)));
      controls.append(action('취소',()=>{choice=null;render();}));
    } else {
      controls.append(action('한 장 뽑기',()=>{
        const before=hands[0].length;
        draw(0,1);
        if(hands[0].length===before) {message='더 뽑을 카드가 없어요.';advance(1);return;}
        drew=true;
        message=legal(0,hands[0].at(-1))?'뽑은 카드를 내거나 차례를 넘기세요.':'뽑은 카드를 낼 수 없어요. 차례를 넘기세요.';
        render();
      },turn!==0 || drew),action('차례 넘기기',()=>advance(1),turn!==0 || !drew));
    }
    const complete=totals.some(score=>score>=500);
    controls.append(action(!complete&&turn===-1?'다음 판':'새 게임',()=>{
      if(turn!==-1||complete) totals=[0,0];
      reset();
    }));
    table.replaceChildren(element('p','봇 카드 '+hands[1].length+'장 · '+(turn===0?'내 차례':turn===1?'봇 차례':'게임 종료'),'subtle'),
      element('p','500점 대전 · 나 '+totals[0]+' : '+totals[1]+' 봇','subtle'),top,element('p','현재 색 · '+colorNames[activeColor],'subtle'),hand,controls,
      element('p','2인 규칙으로 건너뛰기·역방향은 한 번 더 낼 수 있어요. +2·+4 누적과 도전 규칙은 없어요.','subtle'));
  }
  reset();
}

function blackjack() {
  const suits=['♠','♥','♦','♣'];
  let chips=1000, deck, hands=[], dealer=[], current=0, active=false;
  let message='칩을 선택해 첫 카드를 받으세요.';
  const value = cards => {
    let total=cards.reduce((sum,card)=>sum+Math.min(card.rank,10),0);
    if(total<=11 && cards.some(card=>card.rank===1)) total+=10;
    return total;
  };
  function settle() {
    active=false;
    const b=value(dealer), naturalB=dealer.length===2&&b===21;
    const outcomes=hands.map(({cards,bet})=>{
      const a=value(cards), naturalA=hands.length===1&&cards.length===2&&a===21;
      if(a>21) return '버스트';
      if(naturalA&&!naturalB){chips+=bet*2.5;return '블랙잭!';}
      if(naturalB&&!naturalA) return '딜러 블랙잭';
      if(a===b){chips+=bet;return '무승부';}
      if(b>21||a>b){chips+=bet*2;return '승리';}
      return '딜러 승리';
    });
    message=outcomes.map((result,i)=>hands.length>1?'손 '+(i+1)+' · '+result:result).join(' / ');
    render();
  }
  function deal(stake) {
    if(active || chips<stake) return;
    chips-=stake;
    deck=shuffled(suits.flatMap(suit=>Array.from({length:13},(_,i)=>({suit,rank:i+1}))));
    hands=[{cards:[deck.pop(),deck.pop()],bet:stake}];
    current=0;
    dealer=[deck.pop(),deck.pop()];
    active=true;
    message='카드를 더 받거나 멈추세요.';
    if(value(hands[0].cards)===21 || value(dealer)===21) settle(); else render();
  }
  function stand() {
    if(!active) return;
    if(++current<hands.length) {
      message='다음 손을 플레이하세요.';
      if(value(hands[current].cards)===21) stand(); else render();
      return;
    }
    if(hands.some(hand=>value(hand.cards)<=21)) while(value(dealer)<17) dealer.push(deck.pop());
    settle();
  }
  function hit() {
    if(!active) return;
    const {cards}=hands[current];
    cards.push(deck.pop());
    if(value(cards)>=21) stand(); else render();
  }
  function split() {
    const {cards,bet}=hands[current];
    if(hands.length!==1||cards.length!==2||cards[0].rank!==cards[1].rank||chips<bet) return;
    chips-=bet;
    hands=cards.map(card=>({cards:[card,deck.pop()],bet}));
    if(cards[0].rank===1) current=hands.length-1;
    if(cards[0].rank===1||value(hands[0].cards)===21) stand();
    else {message='첫 번째 손부터 플레이하세요.';render();}
  }
  function row(cards,hide) {
    const line=element('div',null,'card-row');
    cards.forEach((card,i)=>line.append(drawBlackjackCard(hide&&i===1?null:card)));
    return line;
  }
  function render() {
    gameStatus.textContent=message;
    const controls=element('div',null,'game-controls');
    if(active) {
      const hand=hands[current];
      controls.append(action('히트',hit),action('스탠드',stand),action('더블',()=>{
        chips-=hand.bet;
        hand.bet*=2;
        hand.cards.push(deck.pop());
        stand();
      },hand.cards.length!==2||chips<hand.bet),action('스플릿',split,
        hands.length!==1||hand.cards.length!==2||hand.cards[0].rank!==hand.cards[1].rank||chips<hand.bet));
    }
    else {
      for(const stake of [10,50,100]) controls.append(action(stake+'칩 · 카드 받기',()=>deal(stake),chips<stake));
      if(chips<10) controls.append(action('가상 칩 충전',()=>{chips=1000;render();}));
    }
    table.replaceChildren(element('p','가상 칩 '+chips.toLocaleString()+(active?' · 베팅 '+hands.reduce((sum,hand)=>sum+hand.bet,0):'')),
      element('p',dealer.length?'딜러 '+(active?'':value(dealer)):'딜러','subtle'),row(dealer,active),
      ...hands.flatMap(({cards},i)=>[element('p',(hands.length>1?'손 '+(i+1):'내 카드')+' · '+value(cards)+(active&&hands.length>1&&current===i?' (진행 중)':''),'subtle'),row(cards,false)]),controls,
      element('p','딜러는 17 이상에서 멈춰요. 블랙잭은 3:2로 지급해요.','subtle'));
  }
  render();
}
if (table.closest('[data-game]').dataset.game === 'uno') uno(); else blackjack();

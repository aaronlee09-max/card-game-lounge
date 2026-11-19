function cardMark(parent,className,label) {
  const mark=document.createElement('span');
  mark.className=className;
  mark.textContent=label;
  mark.setAttribute('aria-hidden','true');
  parent.append(mark);
  return mark;
}

function drawUnoCard(node,card,label) {
  const symbol=({'건너뛰기':'⊘','역방향':'⇆','색 변경':'◈'})[card.value] ?? String(card.value);
  node.textContent='';
  node.classList.add('uno-face');
  node.dataset.color=card.color;
  node.setAttribute('aria-label',label);
  cardMark(node,'card-corner top-corner',symbol);
  cardMark(node,'card-corner bottom-corner',symbol);
  const middle=cardMark(node,'uno-medallion','');
  if (card.value==='+2' || card.value==='+4') {
    const stack=cardMark(middle,'draw-stack','');
    const colors=card.value==='+4' ? ['red','yellow','green','blue'] : [card.color,card.color];
    colors.forEach((color,index)=>{
      const mark=cardMark(stack,'draw-card','');
      mark.dataset.color=color;
      mark.style.setProperty('--i',index);
    });
  } else if (card.value==='색 변경') {
    middle.classList.add('wild-oval');
  } else {
    cardMark(middle,'uno-value',symbol);
  }
}

const pipLayouts={
  2:[[50,27],[50,73]],
  3:[[50,27],[50,50],[50,73]],
  4:[[34,26],[66,26],[34,74],[66,74]],
  5:[[34,26],[66,26],[50,50],[34,74],[66,74]],
  6:[[34,26],[66,26],[34,50],[66,50],[34,74],[66,74]],
  7:[[34,26],[66,26],[50,38],[34,50],[66,50],[34,74],[66,74]],
  8:[[34,26],[66,26],[50,38],[34,50],[66,50],[50,62],[34,74],[66,74]],
  9:[[34,24],[66,24],[34,41],[66,41],[50,50],[34,59],[66,59],[34,76],[66,76]],
  10:[[34,24],[66,24],[50,33],[34,41],[66,41],[34,59],[66,59],[50,67],[34,76],[66,76]]
};

function drawBlackjackCard(card) {
  const node=document.createElement('span');
  node.className='playing-card poker-face';
  if (!card) {
    node.classList.add('poker-back');
    node.setAttribute('role','img');
    node.setAttribute('aria-label','뒤집힌 카드');
    return node;
  }
  const {rank,suit}=card;
  const face=({1:'A',11:'J',12:'Q',13:'K'})[rank]||rank;
  if ('♥♦'.includes(suit)) node.classList.add('red-suit');
  node.setAttribute('role','img');
  node.setAttribute('aria-label',({'♠':'스페이드','♥':'하트','♦':'다이아몬드','♣':'클럽'})[suit]+' '+face);
  cardMark(node,'card-corner top-corner',face+'\n'+suit);
  cardMark(node,'card-corner bottom-corner',face+'\n'+suit);
  if (rank===1||rank>10) {
    if(rank===1) cardMark(node,'poker-medallion ace-mark',suit);
    else {
      const portrait=cardMark(node,'court-panel','');
      const emblem=rank===11?'⚜':rank===12?'♛':'♚';
      for(const side of ['upright','inverted']) {
        const figure=cardMark(portrait,'court-figure '+side,'');
        cardMark(figure,'court-crown',emblem);
        cardMark(figure,'court-suit',suit);
      }
    }
  } else {
    for(const [x,y] of pipLayouts[rank]) {
      const pip=cardMark(node,'poker-pip',suit);
      pip.style.left=x+'%';
      pip.style.top=y+'%';
      if(y>50) pip.classList.add('inverted');
    }
  }
  return node;
}

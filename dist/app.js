const names = ['삭', '초승달', '상현달', '차는 볼록달', '보름달', '지는 볼록달', '하현달', '그믐달'];
const levels = [
  { width: 3, shape: ['###', '###', '###'] },
  { width: 4, shape: ['.##.', '####', '####', '.##.'] },
  { width: 5, shape: ['.###.', '#####', '#####', '#####', '.###.'] },
];

function combinations(board, index, phase, width) {
  const row = Math.floor(index / width);
  const col = index % width;
  const at = (r, c) => r >= 0 && c >= 0 && c < width ? board[r * width + c] : null;
  const matches = [];
  for (const [dr, dc] of [[0, 1], [1, 0]]) {
    if (phase === 4) {
      const fullMoons = [index];
      for (const direction of [-1, 1]) {
        for (let distance = 1; distance < board.length; distance++) {
          const neighbor = at(row + dr * direction * distance, col + dc * direction * distance);
          if (neighbor?.phase !== 4) break;
          fullMoons.push(neighbor.index);
        }
      }
      if (fullMoons.length >= 4) {
        matches.push({score: (fullMoons.length - 3) * 10, cards: fullMoons,
          name: '보름달 ' + fullMoons.length + '연속 보너스'});
      }
    }

    for (const direction of [-1, 1]) {
      const neighbor = at(row + dr * direction, col + dc * direction);
      if (neighbor?.phase === phase) matches.push({ score: 1, cards: [index, neighbor.index], name: '같은 위상 페어' });
      if (neighbor?.phase === (phase + 4) % 8) matches.push({ score: 2, cards: [index, neighbor.index], name: '보름달 페어' });
    }
    for (const step of [-1, 1]) {
      const cards = [index];
      for (const direction of [-1, 1]) {
        for (let distance = 1; distance < 8; distance++) {
          const offset = direction * distance;
          const neighbor = at(row + dr * offset, col + dc * offset);
          if (neighbor?.phase !== (phase + step * offset + 8) % 8) break;
          cards.push(neighbor.index);
        }
      }
      if (cards.length >= 3) matches.push({ score: cards.length, cards, name: '달의 순환' });
    }
  }
  return matches;
}

function moon(phase) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d');
  const illumination = Math.cos(phase * Math.PI / 4);
  const direction = phase <= 4 ? 1 : -1;
  const image = ctx.createImageData(96, 96);
  const craters = [[-13,-11,6],[8,13,8],[16,-10,4],[-19,12,4],[1,-22,5]];
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 96; x++) {
      const dx = x - 47.5;
      const dy = y - 47.5;
      const radius = Math.hypot(dx, dy);
      if (radius >= 43) continue;
      const edge = Math.sqrt(42 ** 2 - Math.min(42, Math.abs(dy)) ** 2);
      const light = direction * dx > illumination * edge;
      const base = light ? [232, 239, 255] : [83, 101, 161];
      const crater = craters.reduce((shade, [cx, cy, r]) => shade + Math.max(0, 1 - Math.hypot(dx - cx, dy - cy) / r) * 28, 0);
      const pixel = (y * 96 + x) * 4;
      for (let channel = 0; channel < 3; channel++) image.data[pixel + channel] = base[channel] - crater - radius / 8;
      image.data[pixel + 3] = Math.min(255, (43 - radius) * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  ctx.beginPath();
  ctx.arc(48, 48, 42, 0, 2 * Math.PI);
  ctx.strokeStyle = '#958dbb';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  return canvas;
}

function startGame() {
  const $ = id => document.getElementById(id);
  const drawings = names.map((_, phase) => moon(phase));
  function icon(phase) {
    const copy = drawings[phase].cloneNode();
    copy.getContext('2d').drawImage(drawings[phase], 0, 0);
    return copy;
  }
  let fullMoonSeats = [false,false];
  let level = 0;
  let local = false;
  let handoff = false;
  const activeSeat = () => local && turn === 1 ? 1 : 0;
  const playable = () => !handoff && (turn === 0 || (local && turn === 1));
  const playerLabel = seat => local ? (seat + 1) + 'P' : seat === 0 ? '나' : '반달';
  let board, hands, scores, selected, last, timer, message, turn, stageWon;
  let matched = new Set();
  let links = [];
  let movePoints = 0;
  let cancelDrag;
  let lastInputWasKeyboard = false;
  document.addEventListener('pointerdown', () => { lastInputWasKeyboard = false; });
  document.addEventListener('keydown', () => { lastInputWasKeyboard = true; });
  const pick = n => Math.floor(Math.random() * n);
  function reset() {
    cancelDrag?.();
    handoff = false;
    clearTimeout(timer);
    const {shape} = levels[level];
    board = shape.join('').split('').map(cell => cell === '#' ? null : false);
    hands = Array.from({length: 2}, (_, player) => Array.from({length: 3}, () => fullMoonSeats[player] ? 4 : pick(8)));
    scores = [0, 0];
    selected = null;
    last = null;
    matched.clear();
    links = [];
    movePoints = 0;
    turn = 0;
    stageWon = false;
    message = '카드를 빈 칸으로 끌거나, 카드와 빈 칸을 차례로 누르세요.';
    $('result').hidden = true;
    render();
  }
  $('full-moon').onclick = () => {
    if (!playable()) return;
    const password = requestFullMoonPassword();
    if (password === null) return;
    if (password !== fullMoonPassword()) {
      $('status').textContent = '비밀번호가 맞지 않아요.';
      return;
    }
    cancelDrag?.();
    fullMoonSeats[activeSeat()] = true;
    hands[activeSeat()] = hands[activeSeat()].map(()=>4);
    selected = null;
    message = '게임 화면을 닫을 때까지 내 카드는 모두 보름달이에요.';
    render();
  };
  function render() {
    $('full-moon').disabled = !playable();
    const width = levels[level].width;
    $('player-score').parentElement.firstElementChild.textContent = playerLabel(0);
    $('rival-score').parentElement.firstElementChild.textContent = playerLabel(1);
    $('rival-hand').hidden = local;
    $('rival-hand').style.display = local ? 'none' : '';
    $('pass-device').hidden = !handoff;
    $('level').textContent = '스테이지 ' + (level + 1) + ' / ' + levels.length;
    $('status').textContent = message;
    $('player-score').textContent = String(scores[0]).padStart(2, '0');
    $('rival-score').textContent = String(scores[1]).padStart(2, '0');
    $('selection').textContent = selected === null ? '카드를 선택하세요' : names[hands[activeSeat()][selected]] + ' 선택됨';
    $('board').style.setProperty('--cols', width);
    $('board').classList.toggle('aiming', selected !== null);
    document.querySelector('.moon-face').classList.toggle('thinking', turn === 1);
    $('board').replaceChildren(...board.map((card, index) => {
      if (card === false) {
        const space = document.createElement('span');
        space.className = 'void';
        return space;
      }
      const tile = document.createElement('button');
      tile.className = 'tile';
      tile.dataset.index = index;
      if (index % width < width - 1 && board[index + 1] !== false) tile.classList.add('east');
      if (index + width < board.length && board[index + width] !== false) tile.classList.add('south');
      if (links.some(([a, b]) => a === index && b === index + 1)) tile.classList.add('lit-east');
      if (links.some(([a, b]) => a === index && b === index + width)) tile.classList.add('lit-south');
      tile.disabled = !!card || !playable();
      const position = (Math.floor(index / width) + 1) + '행 ' + (index % width + 1) + '열';
      if (card) {
        tile.classList.add('filled', card.owner === 0 ? 'mine' : 'theirs');
        if (index === last) tile.classList.add('last');
        if (matched.has(index)) tile.classList.add('matched');
        tile.setAttribute('aria-label', position + ' ' + names[card.phase] + ' · ' + (local ? playerLabel(card.owner) + ' 영역' : card.owner === 0 ? '내 영역' : '반달 영역'));
        tile.title = names[card.phase];
        tile.append(icon(card.phase));
        if (index === last && movePoints) {
          const gain = document.createElement('span');
          gain.className = 'score-rise';
          gain.textContent = '+' + movePoints;
          gain.setAttribute('aria-hidden', 'true');
          tile.append(gain);
        }
      } else {
        tile.setAttribute('aria-label', position + ' 빈 칸');
        tile.innerHTML = '<span class="empty" aria-hidden="true"></span>';
        tile.onclick = () => {
          if (selected === null) {
            message = '먼저 내 카드를 선택하세요.';
            $('status').textContent = message;
            return;
          }
          place(activeSeat(), selected, index);
        };
      }
      return tile;
    }));
    $('hand').replaceChildren(...(handoff ? [] : hands[activeSeat()]).map((phase, slot) => {
      const card = document.createElement('button');
      card.className = 'card';
      card.disabled = !playable();
      card.setAttribute('aria-pressed', selected === slot);
      card.append(icon(phase), names[phase]);
      enableDrag(card, slot);
      card.onclick = () => {
        selected = selected === slot ? null : slot;
        for (const [index, button] of [...$('hand').children].entries()) {
          button.setAttribute('aria-pressed', selected === index);
        }
        $('selection').textContent = selected === null ? '카드를 선택하세요' : names[phase] + ' 선택됨';
        $('board').classList.toggle('aiming', selected !== null);
        showHints(selected);
      };
      return card;
    }));
    showHints(selected);
  }

  function showHints(slot) {
    const width = levels[level].width;
    for (const tile of $('board').querySelectorAll('.tile')) {
      delete tile.dataset.points;
      tile.querySelector('.point-preview')?.remove();
      if (slot === null || tile.disabled || !$('hints').checked) continue;
      const matches = combinations(board, Number(tile.dataset.index), hands[activeSeat()][slot], width);
      const points = matches.reduce((sum, match) => sum + match.score, 0);
      if (!points) continue;
      tile.dataset.points = points;
      const badge = document.createElement('span');
      badge.className = 'point-preview';
      badge.textContent = '+' + points;
      tile.append(badge);
    }
  }

  function enableDrag(card, slot) {
    card.onpointerdown = event => {
      if (!playable() || cancelDrag || !event.isPrimary || event.button !== 0) return;
      const pointer = event.pointerId;
      const startX = event.clientX;
      const startY = event.clientY;
      let ghost, highlighted;
      card.setPointerCapture(pointer);

      function targetAt(event) {
        const tile = document.elementFromPoint(event.clientX, event.clientY)?.closest('#board .tile');
        return tile && !tile.disabled ? tile : null;
      }

      function move(event) {
        if (event.pointerId !== pointer) return;
        if (!ghost) {
          if (Math.hypot(event.clientX - startX, event.clientY - startY) < 7) return;
          const bounds = card.getBoundingClientRect();
          ghost = document.createElement('div');
          ghost.className = 'card drag-ghost';
          ghost.setAttribute('aria-hidden', 'true');
          ghost.style.width = bounds.width + 'px';
          ghost.style.height = bounds.height + 'px';
          const phase = hands[activeSeat()][slot];
          ghost.append(icon(phase), names[phase]);
          document.body.append(ghost);
          card.classList.add('drag-source');
          $('board').classList.add('drag-active');
          showHints(slot);
        }
        ghost.style.left = event.clientX + 'px';
        ghost.style.top = event.clientY + 'px';
        const edge = 52;
        if (event.clientY < edge) window.scrollBy(0, -10);
        if (event.clientY > window.innerHeight - edge) window.scrollBy(0, 10);
        highlighted?.classList.remove('drop-target');
        highlighted = targetAt(event);
        highlighted?.classList.add('drop-target');
        const points = highlighted?.dataset.points;
        $('selection').textContent = points ? '이 칸에 놓으면 +' + points + '점' : '카드를 빈 칸에 놓으세요';
      }

      function cleanup() {
        cancelDrag = undefined;
        highlighted?.classList.remove('drop-target');
        ghost?.remove();
        card.classList.remove('drag-source');
        $('board').classList.remove('drag-active');
        if (ghost) {
          showHints(selected);
          $('selection').textContent = selected === null ? '카드를 선택하세요' : names[hands[activeSeat()][selected]] + ' 선택됨';
        }
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerup', finish);
        card.removeEventListener('pointercancel', finish);
        card.removeEventListener('lostpointercapture', finish);
        if (card.hasPointerCapture(pointer)) card.releasePointerCapture(pointer);
      }

      function finish(event) {
        if (event.pointerId !== pointer) return;
        const dragged = Boolean(ghost);
        const target = dragged && event.type === 'pointerup' ? targetAt(event) : null;
        cleanup();
        if (dragged && event.type === 'pointerup') {
          // Ignore the click generated when the captured pointer is released.
          const ignoreClick = click => click.stopImmediatePropagation();
          card.addEventListener('click', ignoreClick, { capture: true, once: true });
          setTimeout(() => card.removeEventListener('click', ignoreClick, true), 0);
        }
        if (target) place(activeSeat(), slot, Number(target.dataset.index), true);
      }

      cancelDrag = cleanup;
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerup', finish);
      card.addEventListener('pointercancel', finish);
      card.addEventListener('lostpointercapture', finish);
    };
  }

  function place(player, slot, index, dropped = false) {
    if (turn !== player || board[index] !== null) return;
    const source = $(local || player === 0 ? 'hand' : 'rival-hand').children[slot];
    const origin = source.getBoundingClientRect();
    const phase = hands[player][slot];
    const matches = combinations(board, index, phase, levels[level].width);
    board[index] = { phase, index, owner: player };
    const points = matches.reduce((total, match) => total + match.score, 0);
    matched = new Set(matches.flatMap(match => match.cards));
    links = [];
    const width = levels[level].width;
    for (const match of matches) {
      const ordered = [...match.cards].sort((a, b) => a - b);
      for (let i = 1; i < ordered.length; i++) {
        const a = ordered[i - 1], b = ordered[i];
        if (b - a === width || (b - a === 1 && Math.floor(a / width) === Math.floor(b / width))) links.push([a, b]);
      }
    }
    for (const target of matched) board[target].owner = player;
    movePoints = points;
    scores[player] += points;
    last = index;
    hands[player][slot] = fullMoonSeats[player] ? 4 : pick(8);
    selected = null;
    const summary = points ? [...new Set(matches.map(match => match.name))].join(' · ') + ' +' + points : names[phase] + ' 놓기';
    message = playerLabel(player) + ' · ' + summary;
    if (!board.includes(null)) {
      finish();
      if (!dropped) animatePlacement(origin, index);
      return;
    }
    turn = 1 - player;
    if (local) {
      handoff = true;
      message += '\n' + playerLabel(turn) + '에게 기기를 넘겨주세요.';
      render();
      $('pass-device').focus();
      return;
    }
    message += turn === 1 ? '\n반달이 고르는 중…' : '\n내 차례예요.';
    render();
    if (!dropped) animatePlacement(origin, index);
    if (turn === 1) timer = setTimeout(opponent, 750);
    if (turn === 0 && document.activeElement === document.body && lastInputWasKeyboard) {
      $('hand').querySelector('button').focus();
    }
  }
  function animatePlacement(origin, index) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tile = $('board').children[index];
    const destination = tile.getBoundingClientRect();
    const x = origin.left + origin.width / 2 - destination.left - destination.width / 2;
    const y = origin.top + origin.height / 2 - destination.top - destination.height / 2;
    const piece = tile.querySelector('canvas');
    piece.animate(
      [{ transform: 'translate(' + x + 'px,' + y + 'px) scale(1.55)', opacity: .55 },
       { transform: 'translate(0,0) scale(1)', opacity: 1 }],
      { duration: 290, easing: 'cubic-bezier(.21,.7,.28,1)' }
    );
  }

  function opponent() {
    const moves = [];
    for (const [index, card] of board.entries()) {
      if (card !== null) continue;
      for (const [slot, phase] of hands[1].entries()) {
        const matches = combinations(board, index, phase, levels[level].width);
        const points = matches.reduce((sum, match) => sum + match.score, 0);
        const steals = new Set(matches.flatMap(match => match.cards).filter(i => board[i]?.owner === 0)).size;
        const weight = points + (level === 0 ? 0 : steals) + Math.random() * (level === 0 ? 2.7 : 1);
        moves.push({ index, slot, weight });
      }
    }
    const best = moves.sort((a,b) => b.weight - a.weight)[0];
    place(1, best.slot, best.index);
  }
  function finish() {
    turn = -1;
    const bonus = [0, 0];
    for (const card of board) if (card) bonus[card.owner]++;
    scores = scores.map((score, player) => score + bonus[player]);
    stageWon = scores[0] > scores[1];
    message += '\n최종 점수';
    render();
    if (local) {
      showJourney(false, '1P ' + scores[0] + '점 · 2P ' + scores[1] + '점');
      $('result-title').textContent = scores[0] === scores[1] ? '무승부!' : playerLabel(scores[0] > scores[1] ? 0 : 1) + ' 승리!';
      $('continue').textContent = '다시 대전';
      return;
    }
    showJourney(false, '나 ' + scores[0] + '점 · 반달 ' + scores[1] + '점 · 영역 보너스 +' + bonus[0] + ' / +' + bonus[1]);
  }

  let journeyStart = false;
  function showJourney(initial, detail) {
    journeyStart = initial;
    const wins = level + Number(!initial && stageWon);
    const reachedMoon = wins === levels.length;
    $('play-screen').hidden = true;
    $('result').hidden = false;
    for (const [index, star] of [...$('journey-stars').children].reverse().entries()) {
      star.classList.toggle('earned', index < wins);
      star.setAttribute('aria-label', (index + 1) + '번째 별 ' + (index < wins ? '획득' : '미획득'));
    }
    $('result-title').textContent = initial ? '세 판 연속으로 이겨 달에 도착하세요' :
      reachedMoon ? '달에 도착했어요!' : stageWon ? '별을 하나 얻었어요!' :
      scores[0] === scores[1] ? '무승부예요' : '이번엔 반달이 이겼어요';
    $('result-detail').textContent = detail || '';
    $('continue').textContent = initial ? '첫 판 시작' :
      reachedMoon || !stageWon ? '처음부터 다시' : '다음 판';
    $('continue').focus();
  }

  $('continue').onclick = () => {
    if (!journeyStart && !local) level = stageWon ? (level + 1) % levels.length : 0;
    $('play-screen').hidden = false;
    reset();
    $('hand').querySelector('button').focus();
  };
  function openGame() {
    $('opening').hidden = true;
    showJourney(true);
  }
  const lessons = [
    { title: '같은 위상 페어', phases: [1, null], card: 1, points: 1 },
    { title: '보름달 페어', phases: [2, null], card: 6, points: 2 },
    { title: '달의 순환', phases: [0, 1, null], card: 2, points: 3 },
  ];
  let lessonIndex = 0;
  let lessonComplete = false;
  let startAfterLesson = false;
  const tutorial = $('tutorial');

  function showLesson() {
    const { title, phases, card, points } = lessons[lessonIndex];
    const lastSlot = phases.length - 1;
    lessonComplete = false;
    $('lesson-title').textContent = title;
    $('lesson-prompt').textContent = '아래 카드를 빈 칸으로 끌어 놓으세요. 차례로 눌러도 돼요.';
    $('lesson-status').textContent = '';
    $('lesson-next').disabled = true;
    $('lesson-next').textContent = lessonIndex < lessons.length - 1 ? '다음' : '연습 끝';
    $('lesson-card').replaceChildren(icon(card), names[card]);
    $('lesson-card').disabled = false;
    $('lesson-card').setAttribute('aria-pressed', 'false');
    $('lesson-board').replaceChildren(...phases.map(phase => {
      const tile = document.createElement(phase === null ? 'button' : 'span');
      tile.className = 'tile';
      if (phase !== null) {
        tile.classList.add('filled');
        tile.append(icon(phase));
        tile.setAttribute('role', 'img');
        tile.setAttribute('aria-label', names[phase]);
        return tile;
      }
      tile.setAttribute('aria-label', '연습 빈 칸');
      tile.onclick = () => {
        if ($('lesson-card').getAttribute('aria-pressed') !== 'true') {
          $('lesson-status').textContent = '아래 카드를 먼저 선택하세요.';
          $('lesson-card').focus();
          return;
        }
        const practiceBoard = phases.map((phase, index) => phase === null ? null : { phase, index });
        const matches = combinations(practiceBoard, lastSlot, card, phases.length);
        const total = matches.reduce((sum, match) => sum + match.score, 0);
        lessonComplete = total === points;
        tile.replaceChildren(icon(card));
        tile.setAttribute('aria-label', names[card]);
        tile.classList.add('filled');
        tile.disabled = true;
        for (const square of $('lesson-board').children) square.classList.add('matched', 'mine');
        $('lesson-card').disabled = true;
        $('lesson-status').textContent = title + ' +' + total + '점';
        $('lesson-next').disabled = !lessonComplete;
        $('lesson-next').focus();
      };
      return tile;
    }));
    $('lesson-card').focus();
  }

  function openTutorial(startGameAfter) {
    startAfterLesson = startGameAfter;
    lessonIndex = 0;
    tutorial.showModal();
    showLesson();
  }

  $('lesson-card').onclick = () => {
    $('lesson-card').setAttribute('aria-pressed', 'true');
    $('lesson-board').querySelector('button').focus();
  };
  const practiceCard = $('lesson-card');
  practiceCard.onpointerdown = event => {
    if (!event.isPrimary || event.button !== 0) return;
    const pointer = event.pointerId;
    const cardBounds = practiceCard.getBoundingClientRect();
    const start = { x: event.clientX, y: event.clientY };
    let ghost;
    practiceCard.setPointerCapture(pointer);

    function move(event) {
      if (event.pointerId !== pointer) return;
      if (!ghost && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 7) return;
      if (!ghost) {
        const { card } = lessons[lessonIndex];
        ghost = document.createElement('div');
        ghost.className = 'card drag-ghost';
        ghost.setAttribute('aria-hidden', 'true');
        ghost.style.width = cardBounds.width + 'px';
        ghost.style.height = cardBounds.height + 'px';
        ghost.append(icon(card), names[card]);
        tutorial.append(ghost);
      }
      ghost.style.left = event.clientX + 'px';
      ghost.style.top = event.clientY + 'px';
    }

    function end(event) {
      if (event.pointerId !== pointer) return;
      const isDrop = ghost && event.type === 'pointerup';
      ghost?.remove();
      practiceCard.removeEventListener('pointermove', move);
      practiceCard.removeEventListener('pointerup', end);
      practiceCard.removeEventListener('pointercancel', end);
      practiceCard.removeEventListener('lostpointercapture', end);
      if (!isDrop) return;
      const ignoreClick = click => click.stopImmediatePropagation();
      practiceCard.addEventListener('click', ignoreClick, { capture: true, once: true });
      setTimeout(() => practiceCard.removeEventListener('click', ignoreClick, true), 0);
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('#lesson-board button:not(:disabled)');
      if (!target) return;
      practiceCard.setAttribute('aria-pressed', 'true');
      target.click();
    }

    practiceCard.addEventListener('pointermove', move);
    practiceCard.addEventListener('pointerup', end);
    practiceCard.addEventListener('pointercancel', end);
    practiceCard.addEventListener('lostpointercapture', end);
  };
  $('lesson-skip').onclick = () => tutorial.close();
  $('lesson-next').onclick = () => {
    if (!lessonComplete) return;
    if (++lessonIndex === lessons.length) tutorial.close();
    else showLesson();
  };
  tutorial.addEventListener('close', () => {
    if (startAfterLesson) {
      try { localStorage.setItem('moon-tutorial-seen', '1'); } catch {}
      openGame();
    } else $('help').focus();
  });
  $('pass-device').onclick = () => {
    handoff = false;
    message = playerLabel(turn) + ' 차례예요.';
    render();
    $('hand').firstElementChild?.focus();
  };
  $('practice-mode').onclick = () => openTutorial(false);
  $('local-mode').onclick = () => {
    local = true;
    level = 0;
    $('opening').hidden = true;
    $('play-screen').hidden = false;
    reset();
    $('status').textContent = '1P 차례예요.';
  };
  $('start').onclick = () => {
    let seen = false;
    try { seen = localStorage.getItem('moon-tutorial-seen') === '1'; } catch {}
    if (seen) openGame();
    else openTutorial(true);
  };
  $('lesson-replay').onclick = () => {
    $('rules').close();
    openTutorial(false);
  };
  $('hints').onchange = () => showHints(selected);
  $('restart').onclick = reset;
  $('help').onclick = () => $('rules').showModal();
  for (const [phase, name] of names.entries()) {
    const item = document.createElement('li');
    item.append(icon(phase), name);
    $('phases').append(item);
  }
  reset();
}
if (typeof document !== 'undefined') startGame();
if (typeof module !== 'undefined') module.exports = { combinations };

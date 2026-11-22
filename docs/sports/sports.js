const sports = [
  ['축구', 'goal', 128, 0.91, '킥으로 상대 골대에 넣으세요.'],
  ['아이스하키', 'goal', 90, 0.994, '빙판에서 퍽을 밀어 좁은 골대에 넣으세요.'],
  ['핸드볼', 'goal', 105, 0.96, '공 가까이서 던져 상대 골대에 넣으세요.'],
  ['수구', 'goal', 155, 0.87, '물에서 느리게 움직이며 넓은 골대를 노리세요.'],
  ['테니스', 'rally', 63, 6.1, '공을 받아치세요. 공을 놓친 쪽이 실점해요.'],
  ['탁구', 'rally', 42, 8.3, '작은 라켓으로 빠른 공을 받아치세요.'],
  ['배드민턴', 'rally', 77, 5.3, '넓은 라켓으로 셔틀콕을 받아치세요.'],
  ['배구', 'rally', 92, 7.2, '공을 상대편 끝까지 보내세요.'],
  ['농구 자유투', 'aim', 43, 4.6, '조준점을 바구니 중심에 맞추고 던지세요.'],
  ['양궁', 'aim', 33, 3.7, '이동하는 조준점을 과녁 중심에 맞춰 발사하세요.'],
  ['볼링', 'aim', 61, 5.2, '조준점이 핀 중앙에 가까울 때 공을 굴리세요.'],
  ['컬링', 'aim', 38, 2.9, '하우스 중앙에 맞춰 스톤을 보내세요.'],
  ['다트', 'aim', 26, 5.7, '빠르게 움직이는 조준점을 불스아이에 맞추세요.'],
  ['미니 골프', 'aim', 36, 2.3, '퍼팅 방향이 홀에 맞을 때 동작 버튼을 누르세요.'],
  ['100m 달리기', 'race', 690, 17, '동작 버튼을 반복해 먼저 결승선을 넘으세요.'],
  ['사이클', 'race', 690, 14, '동작 버튼을 반복하고 위아래로 장애물을 피하세요.'],
  ['스피드 스케이팅', 'race', 650, 15, '동작 버튼을 반복하고 위아래로 빙판 장애물을 피하세요.'],
  ['조정', 'race', 715, 12, '동작 버튼으로 노를 젓고 위아래로 부표를 피하세요.'],
  ['펜싱', 'duel', 114, 4.1, '상대와 가까워졌을 때 동작 버튼으로 찌르세요.'],
  ['복싱', 'duel', 65, 5.3, '가까이 접근해 동작 버튼으로 펀치를 맞히세요.'],
];

const picker = document.querySelector('#sport');
const status = document.querySelector('#status');
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
const palette = ['#ff7d83', '#65c6ff'];
const controls = [['w', 'a', 's', 'd', 'f'], ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Enter']];
const gameKeys = new Set(controls.flat());
const pressed = new Set();
const action = [false, false];
let players, ball, score, winner, mode, size, pace, frame, roundDelay;

sports.forEach(([name], i) => picker.add(new Option(name, i)));
const requested = new URLSearchParams(location.search).get('sport');
if (requested !== null && sports[requested]) picker.value = requested;

function announce(message) {
  status.textContent = message;
}

function resetRound() {
  players = [0, 1].map(i => ({x: mode === 'race' ? 55 : i ? 670 : 130, y: mode === 'race' ? 100 + i * 215 : 210, cooldown: 0}));
  ball = {x: 400, y: 210, vx: (score[0] + score[1]) % 2 ? -pace : pace, vy: 2.4};
  roundDelay = 48;
  action.fill(false);
}

function start() {
  const [, kind, dimension, speed, rules] = sports[Number(picker.value)];
  mode = kind;
  size = dimension;
  pace = speed;
  score = [0, 0];
  winner = -1;
  frame = 0;
  document.querySelector('#rules').textContent = rules + (mode === 'race' ? ' 3라운드 선승.' : ' 5점 선승.');
  announce('경기 시작');
  updateScore();
  resetRound();
}

function updateScore() {
  document.querySelector('#red').textContent = '빨강 ' + score[0];
  document.querySelector('#blue').textContent = '파랑 ' + score[1];
}

function point(i) {
  score[i]++;
  updateScore();
  const name = i ? '파랑' : '빨강';
  if (score[i] >= (mode === 'race' ? 3 : 5)) {
    winner = i;
    announce(name + ' 승리! 다시 시작 버튼으로 재경기할 수 있어요.');
  } else {
    announce(name + ' 득점!');
    resetRound();
  }
}

const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
const down = (i, j) => +pressed.has(controls[i][j]);
const cursor = i => (i ? 600 : 200) + 139 * Math.sin(frame * pace / 115 + i);
const obstacles = [245, 425, 580];

function update() {
  if (winner >= 0) return;
  frame++;
  if (roundDelay > 0) {
    roundDelay--;
    action.fill(false);
    return;
  }
  for (const [i, p] of players.entries()) {
    const dy = down(i, 2) - down(i, 0);
    const dx = down(i, 3) - down(i, 1);
    const q = players[1 - i];
    if (mode === 'aim' && action[i] && Math.abs(cursor(i) - (i ? 600 : 200)) < size / 2) {
      point(i);
      return;
    }
    if (mode === 'race') {
      p.y = clamp(p.y + dy * 4, i * 210 + 27, i * 210 + 183);
      if (action[i]) {
        const blocked = picker.value !== '14' && obstacles.some(x => Math.abs(x - p.x) < 19 && Math.abs(p.y - (105 + i * 210)) < 30);
        p.x += blocked ? 3 : pace;
        if (p.x >= size) {
          point(i);
          return;
        }
      }
    }
    if (mode === 'rally') p.y = clamp(p.y + dy * 6, size / 2, 420 - size / 2);
    if (mode === 'goal' || mode === 'duel') {
      const speed = mode === 'goal' ? 2.8 + pace : pace;
      p.x = clamp(p.x + dx * speed, 20, 780);
      p.y = clamp(p.y + dy * speed, 20, 400);
    }
    if (mode === 'goal' && Math.hypot(ball.x - p.x, ball.y - p.y) < 31) {
      const angle = Math.atan2(ball.y - p.y, ball.x - p.x);
      const power = action[i] ? 14 : 5;
      ball.vx = Math.cos(angle) * power;
      ball.vy = Math.sin(angle) * power;
    }
    if (mode === 'duel' && action[i] && frame >= p.cooldown) {
      p.cooldown = frame + 35;
      if (Math.hypot(p.x - q.x, p.y - q.y) < size) {
        point(i);
        return;
      }
    }
  }
  action.fill(false);
  if (mode !== 'rally' && mode !== 'goal') return;
  ball.x += ball.vx;
  ball.y += ball.vy;
  if (ball.y < 10 || ball.y > 410) {
    ball.y = clamp(ball.y, 10, 410);
    ball.vy *= -1;
  }
  if (mode === 'rally') {
    for (const [i, p] of players.entries()) {
      if (Math.abs(ball.x - p.x) < 16 && Math.abs(ball.y - p.y) < size / 2 + 7 && (i ? ball.vx > 0 : ball.vx < 0)) {
        ball.vx = (i ? -1 : 1) * Math.min(12, Math.abs(ball.vx) + 0.45);
        ball.vy = 7 * (ball.y - p.y) / size;
      }
    }
    if (ball.x < 0 || ball.x > 800) point(ball.x < 0 ? 1 : 0);
  } else {
    ball.vx *= pace;
    ball.vy *= pace;
    if (ball.x < 9 || ball.x > 791) {
      if (Math.abs(ball.y - 210) < size / 2) point(ball.x < 9 ? 1 : 0);
      else {
        ball.x = clamp(ball.x, 9, 791);
        ball.vx *= -1;
      }
    }
  }
}

function line(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function dot(x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  line(0, 0, 800, 420, mode === 'goal' && picker.value === '0' ? '#195549' : '#183951');
  line(398, 0, 4, 420, '#ffffff35');
  if (mode === 'goal') {
    line(0, 210 - size / 2, 9, size, palette[0]);
    line(791, 210 - size / 2, 9, size, palette[1]);
  }
  if (mode === 'race') {
    line(0, 208, 800, 4, '#ffffff70');
    for (let y = 0; y < 420; y += 20) line(size, y, 8, 10, '#fff');
    if (picker.value !== '14') for (const x of obstacles) for (const y of [105,315]) dot(x + 8, y, 15, '#f8d267');
  }
  if (mode === 'aim') {
    for (const i of [0, 1]) {
      const x = i ? 600 : 200;
      dot(x, 210, 69, '#2b5471');
      dot(x, 210, 44, '#447593');
      dot(x, 210, size / 2, '#ffe167');
      line(cursor(i) - 3, 155, 6, 110, palette[i]);
    }
  } else {
    for (const [i, p] of players.entries()) {
      if (mode === 'rally') line(p.x - 7, p.y - size / 2, 14, size, palette[i]);
      else dot(p.x, p.y, 17, palette[i]);
    }
  }
  if (mode === 'goal' || mode === 'rally') dot(ball.x, ball.y, 8, '#fffde5');
}

function press(key) {
  if (pressed.has(key)) return;
  pressed.add(key);
  const i = controls.findIndex(binding => binding[4] === key);
  if (i >= 0) action[i] = true;
}
window.addEventListener('keydown', event => {
  if (!gameKeys.has(event.key) || event.target.closest('select, button, a')) return;
  event.preventDefault();
  press(event.key);
});
window.addEventListener('keyup', event => pressed.delete(event.key));
window.addEventListener('blur', () => { pressed.clear(); action.fill(false); });
for (const button of document.querySelectorAll('[data-key]')) {
  button.addEventListener('pointerdown', event => {
    button.setPointerCapture(event.pointerId);
    press(button.dataset.key);
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) {
    button.addEventListener(event, () => pressed.delete(button.dataset.key));
  }
  button.addEventListener('click', event => {
    if (event.detail !== 0) return;
    press(button.dataset.key);
    pressed.delete(button.dataset.key);
  });
}
function restart() {
  pressed.clear();
  start();
  document.activeElement.blur();
}
picker.addEventListener('change', restart);
document.querySelector('#restart').addEventListener('click', restart);
start();

let previous = performance.now();
let accumulator = 0;
function animate(now) {
  accumulator += Math.min(now - previous, 50);
  previous = now;
  while (accumulator >= 1000 / 60) {
    update();
    accumulator -= 1000 / 60;
  }
  draw();
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

import json
from pathlib import Path
from html import escape

root = Path('dist/sports')
sports = json.loads((root / 'catalog.json').read_text())
def links(prefix):
    return ''.join(f'<a href="{prefix}{slug}/"><strong>{name}</strong><small>{venue}</small></a>' for slug,name,_,venue,_ in sports)

def page(title, content, prefix, script=''):
    return f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{title} · 스포츠 라운지</title><link rel="stylesheet" href="{prefix}sports.css">{script}</head><body><main>{content}</main></body></html>'''

(root / 'index.html').write_text(page('2인용 스포츠', '<a href="/">← 게임 라운지</a><h1>2인용 스포츠</h1><p>종목을 선택해 같은 화면에서 두 명이 겨루세요.</p><nav class="grid">'+links('./')+'</nav>', './','<script type="module" src="./legacy.js"></script>'))
for slug,name,group,venue,rules in sports:
    folder = root / slug
    folder.mkdir(exist_ok=True)
    controls = ''
    for team,keys in [('빨강','WASD · F'),('파랑','방향키 · Enter')]:
        buttons = ''.join(f'<button data-control="{key}" aria-label="{team} {label}">{icon}</button>' for key,label,icon in [('up','위','↑'),('left','왼쪽','←'),('down','아래','↓'),('right','오른쪽','→'),('act','동작','동작')])
        controls += f'<fieldset><legend>{team} · {keys}</legend>{buttons}</fieldset>'
    body = f'''<a href="../">← 스포츠 종목</a><header><div><small>{venue}</small><h1>{name}</h1></div><button id="restart">재경기</button></header><div class="network"><button id="host">QR 대전방 만들기</button><button id="leave" hidden>방 나가기</button><span id="connection" role="status">같은 화면 2인 대전</span></div><div id="room" hidden><canvas id="qr" aria-label="상대방 참가 QR"></canvas><a id="invite">초대 링크</a></div><p>{escape(rules)}</p><div class="score"><b id="red"></b><b id="blue"></b></div><canvas id="court" width="840" height="440" aria-label="{name} 경기장"></canvas><p id="status" role="status"></p><div class="controls">{controls}</div>'''
    (folder / 'index.html').write_text(page(name,body,'../','<script src="/qr.js" defer></script><script type="module" src="../sports.js"></script>'))

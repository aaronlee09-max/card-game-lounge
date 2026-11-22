"""Build seven original game shells, icons, install guides and Web Clip profiles."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,plistlib,uuid,html
r=Path('dist');domain='https://webtronics.run.place';backend='https://royal-room-nov12-e295.mutedwand2.chatgpt.site';version='20261120-10-2'
source=json.loads((r/'lounge-source.json').read_text());helpkeys=[next(k for k in source if k.startswith(prefix)) for prefix in ['타일 14개','최고 완성층','차례대로 카드를','말을 선택한','가로·세로','같은 숫자를','카드 두 장']]
games=[('rummikub','루미큐브','#237c87'),('jenga','젠가','#a16a3e'),('halli-galli','할리갈리','#a84670'),('chess','체스','#5b65a2'),('gomoku','오목','#51826c'),('domino','도미노','#b87b3d'),('memory','카드 짝 맞추기','#467baa')]
(r/'games.json').write_text(json.dumps([{'id':g,'name':n,'color':c,'help':helpkeys[i]} for i,(g,n,c) in enumerate(games)],ensure_ascii=False,indent=2))
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
clips=[]
for i,(slug,name,color) in enumerate(games):
 d=r/slug;d.mkdir(exist_ok=True)
 im=Image.new('RGB',(512,512),color);draw=ImageDraw.Draw(im)
 if slug=='rummikub':
  for x,y,n in [(65,120,'7'),(193,85,'8'),(321,120,'9')]:
   draw.rounded_rectangle((x,y,x+114,y+306),20,fill='#fff4dc');draw.text((x+22,y+77),n,font=ImageFont.truetype(font,94),fill=color)
 elif slug=='jenga':
  for row in range(5):
   for col in range(3):
    x=92+col*110+(8 if row%2 else 0);y=90+row*65;draw.rounded_rectangle((x,y,x+102,y+53),8,fill=['#f1d29f','#ddb271','#ffe3b0'][col])
 elif slug=='halli-galli':
  draw.ellipse((163,95,349,314),fill='#ffe4a0');draw.rectangle((153,258,359,321),fill='#ffe4a0');draw.rounded_rectangle((134,322,378,353),15,fill='#fff2cf');draw.ellipse((235,75,277,117),fill='#fff2cf');draw.ellipse((235,359,277,401),fill='#edb56f')
 elif slug=='chess':
  draw.text((78,53),'♞',font=ImageFont.truetype(font,345),fill='#f6edda')
 elif slug=='gomoku':
  for x in [128,256,384]:draw.line((x,80,x,432),fill='#c5ddbd',width=5);draw.line((80,x,432,x),fill='#c5ddbd',width=5)
  for x,y,c in [(128,128,'#1b2b36'),(256,256,'#fff6dc'),(384,384,'#1b2b36')]:draw.ellipse((x-48,y-48,x+48,y+48),fill=c)
 elif slug=='domino':
  draw.rounded_rectangle((135,70,377,442),30,fill='#fff2d8');draw.line((154,256,358,256),fill=color,width=6)
  for x,y in [(196,140),(316,206),(196,318),(316,318),(196,390),(316,390)]:draw.ellipse((x-17,y-17,x+17,y+17),fill='#294a55')
 else:
  for x in [70,270]:draw.rounded_rectangle((x,115,x+172,397),24,fill='#e6f0ef');draw.text((x+27,183),'★',font=ImageFont.truetype(font,118),fill=color)
 for size in [192,512]:im.resize((size,size),Image.Resampling.LANCZOS).save(d/f'icon-{size}.png')
 manifest={'id':f'/{slug}/','name':name,'short_name':name,'start_url':f'/{slug}/','scope':f'/{slug}/','display':'standalone','background_color':'#11172e','theme_color':color,'icons':[{'src':f'icon-{s}.png','sizes':f'{s}x{s}','type':'image/png'} for s in [192,512]]};(d/'manifest.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 clip={'PayloadType':'com.apple.webClip.managed','PayloadVersion':1,'PayloadIdentifier':f'place.run.webtronics.{slug}.webclip','PayloadUUID':str(uuid.uuid5(uuid.NAMESPACE_URL,domain+'/'+slug+'/clip')).upper(),'PayloadDisplayName':name,'Label':name,'URL':domain+'/'+slug+'/','FullScreen':True,'IsRemovable':False,'Icon':(d/'icon-192.png').read_bytes()};clips.append(clip)
 profile={'PayloadType':'Configuration','PayloadVersion':1,'PayloadIdentifier':f'place.run.webtronics.{slug}','PayloadUUID':str(uuid.uuid5(uuid.NAMESPACE_URL,domain+'/'+slug+'/profile')).upper(),'PayloadDisplayName':name,'PayloadRemovalDisallowed':False,'PayloadContent':[clip]};(d/f'{slug}.mobileconfig').write_bytes(plistlib.dumps(profile))
 body=f'''<main class="board-app" data-board-game="{slug}"><header class="game-topbar"><div class="game-brand"><img src="./icon-192.png" alt="" width="56" height="56"><h1>{name}</h1></div><nav><a href="/">라운지</a> · <a href="./install.html">설치 및 다운로드</a></nav></header><section class="game-layout"><section id="board-lobby"><div id="board-modes"></div></section><p id="board-status" class="board-status" role="status" aria-live="polite"></p><section id="board-play" hidden><p id="board-score"></p><section id="board-invite" class="board-invite" hidden><a id="board-invite-url"></a><p><button id="board-copy" class="game-button">링크 복사</button></p><canvas id="board-qr" aria-label="QR"></canvas></section><div id="board-table"></div><div class="game-toolbar"><button id="board-restart" class="game-button">다시 시작</button><button id="board-back" class="game-button">모드 선택</button></div></section></section><details class="board-rules"><summary>규칙 및 도움말</summary><p>{helpkeys[i]}</p></details><p class="subtle">새 게임 7종은 자체 제작 그래픽을 사용하는 비공식 구현입니다. 상표는 각 권리자에게 있습니다.</p><p id="offline-status" role="status"></p><button id="install-app" hidden>설치 및 다운로드</button></main>'''
 scripts=['site-language.js','qr.js','board-rules.js','lounge-rules.js','vendor/chess.js','board-client.js','install.js']
 head=f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="{color}"><meta name="apple-mobile-web-app-capable" content="yes"><title>{name} · 라운지</title><link rel="manifest" href="./manifest.webmanifest"><link rel="apple-touch-icon" href="./icon-192.png"><link rel="stylesheet" href="/moon.css?v={version}"><link rel="stylesheet" href="/board.css?v={version}">'+''.join(f'<script defer src="/{s}?v={version}"></script>' for s in scripts)+'</head><body>'
 (d/'index.html').write_text(head+body+'</body></html>')
 install1='Safari의 공유 메뉴에서 홈 화면에 추가를 선택하세요. Android에서는 Chrome 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하세요.'
 install2='인터넷이 연결된 상태에서 게임을 한 번 열어 오프라인 준비 완료를 확인하세요. HTML 파일은 내려받아 HTML 실행을 지원하는 브라우저에서 여세요. iOS 파일 미리보기는 게임 실행을 지원하지 않을 수 있습니다. 온라인 대전에는 인터넷이 필요합니다.'
 profiletext='구성 프로파일은 서명되지 않은 홈 화면 바로가기입니다. 설정의 VPN 및 기기 관리에서 내용을 확인한 뒤 설치하세요. 제거하려면 프로파일을 삭제하세요.'
 install=f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{name} · 설치 및 다운로드</title><link rel="stylesheet" href="/moon.css?v={version}"><link rel="stylesheet" href="/board.css?v={version}"><link rel="manifest" href="./manifest.webmanifest"><script defer src="/site-language.js?v={version}"></script><script defer src="/install.js?v={version}"></script></head><body><main class="install-page board-app"><a href="/">라운지</a><p><img class="game-icon" src="./icon-192.png" alt="" width="88" height="88"></p><h1>{name}</h1><h2>설치 및 다운로드</h2><p>{install1}</p><p><a class="primary" href="./">시작</a></p><button id="install-app" hidden>설치 및 다운로드</button><h2>오프라인 HTML</h2><p>{install2}</p><p><a class="primary" href="{backend}/download/{slug}/{slug}-offline.html" download>{name} · 오프라인 HTML</a></p><h2>모바일 구성</h2><p><a class="profile-download" href="{backend}/download/{slug}/{slug}.mobileconfig" download><img src="/profile-download-ko.svg" width="200" alt="모바일 구성 다운로드"></a></p><p>{profiletext}</p><p id="offline-status" role="status"></p></main></body></html>'''
 (d/'install.html').write_text(install)
p=r/'all-games.mobileconfig';allp=plistlib.loads(p.read_bytes());allp['PayloadContent']=[c for c in allp['PayloadContent'] if c['URL'].rstrip('/').split('/')[-1] not in [g[0] for g in games]]+clips;allp['PayloadDescription']='라운지와 게임 10종, 총 11개 홈 화면 아이콘';p.write_bytes(plistlib.dumps(allp))
# Keep original game routes, icons and their online controls intact.
allgames=[('moonring','달의 고리','#3d415e','/moon-192.png','/moon-install.html'),('uno/','우노','#723d55','/uno/icon-192.png','/uno/install.html'),('blackjack/','블랙잭','#225c4f','/blackjack/icon-192.png','/blackjack/install.html')]+[(g+'/',n,c,'/'+g+'/icon-192.png','/'+g+'/install.html') for g,n,c in games]
# Preserve the original home composition; append seven cards in the same style.
home=Path('worker/lounge-template.html').read_text()
newcards=''.join(f'<article class="game-card" style="background:{c}"><img src="/{g}/icon-192.png" alt="" width="88" height="88"><h2>{n}</h2><p>{"혼자 플레이 · 최고 기록" if g=="memory" else "혼자 플레이 · 로컬 대전" if g=="jenga" else "AI 대전 · 로컬 대전"}</p><a class="primary" href="/{g}/">시작</a><a href="/{g}/install.html">설치 및 다운로드</a></article>' for i,(g,n,c) in enumerate(games))
sports = json.loads(Path('dist/sports/catalog.json').read_text())
sports_card = ''.join(f'<article class="game-card"><h2>{name}</h2><p>{venue} · 같은 화면 2인 대전</p><a class="primary" href="/sports/{slug}/">{name} 시작</a></article>' for slug,name,_,venue,_ in sports)
home=home.replace('</section><p class="intro">',newcards+sports_card+'</section><p class="intro">',1)
# Use a fully translated short subtitle while retaining the original heading and layout.
home=home.replace('달의 고리 · 우노 · 블랙잭<br>','보드·카드 게임 10종과 스포츠 20종<br>')
home=home.replace('20261119-final',version).replace('install.js?v=27','install.js?v='+version)
(r/'index.html').write_text(home)
# A single download hub includes each standalone file and installation guide.
links=[('/moon-offline.html','달의 고리','/moon-install.html'),('/uno/uno-offline.html','우노','/uno/install.html'),('/blackjack/blackjack-offline.html','블랙잭','/blackjack/install.html')]+[(f'/{g}/{g}-offline.html',n,f'/{g}/install.html') for g,n,c in games]
(r/'lounge-install.html').write_text(f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>종합 게임 라운지 · 설치 및 다운로드</title><link rel="stylesheet" href="/moon.css?v={version}"><link rel="stylesheet" href="/board.css?v={version}"><link rel="manifest" href="/lounge.webmanifest"><script defer src="/site-language.js?v={version}"></script><script defer src="/install.js?v={version}"></script></head><body><main class="install-page board-app"><a href="/">라운지</a><h1>종합 게임 라운지</h1><h2>설치 및 다운로드</h2><p>{install1}</p><button id="install-app" hidden>설치 및 다운로드</button><h2>모바일 구성</h2><p><a class="profile-download" href="{backend}/download/lounge.mobileconfig" download><img src="/profile-download-ko.svg" width="200" alt="모바일 구성 다운로드"></a></p><h2>전체 게임 한 번에 설치</h2><p>프로파일은 라운지와 게임 10종, 아이콘 11개를 추가합니다.</p><p><a class="profile-download" href="{backend}/download/all-games.mobileconfig" download><img src="/profile-download-ko.svg" width="200" alt="모바일 구성 다운로드"></a></p><p>{profiletext}</p><h2>오프라인 HTML</h2><p>{install2}</p><ul>'''+''.join(f'<li><a href="{backend}/download{p}" download>{n} · 오프라인 HTML</a> · <a href="{guide}">설치 및 다운로드</a></li>' for p,n,guide in links)+'''</ul><p id="offline-status" role="status"></p></main></body></html>''')
print('Seven game apps built; profile contains',len(allp['PayloadContent']),'Web Clips,',len(p.read_bytes()),'bytes.')

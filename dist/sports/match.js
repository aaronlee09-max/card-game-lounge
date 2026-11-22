const base='wss://lounge-sports-room.fontory.workers.dev/room/';
export function connect(sport,game){
 let socket=null,role='local',playing=false,batch=[];
 const roomBox=document.querySelector('#room'),qr=document.querySelector('#qr'),link=document.querySelector('#invite'),message=document.querySelector('#connection'),host=document.querySelector('#host'),leave=document.querySelector('#leave');
 function local(){
   const old=socket;socket=null;if(old)old.close();role='local';playing=false;batch=[];game.reset();
   document.body.removeAttribute('data-remote');roomBox.hidden=true;host.hidden=false;leave.hidden=true;
   document.querySelector('#restart').disabled=false;
   const u=new URL(location.href);u.hash='';history.replaceState(null,'',u);
 }
 function open(code,side){
   if(socket)return;
   role=side;playing=false;message.textContent='대전방 연결 중…';host.hidden=true;leave.hidden=false;
   const ws=new WebSocket(base+sport+'/'+code+'?role='+side);socket=ws;
   ws.onmessage=e=>{
     if(socket!==ws)return;
     const m=JSON.parse(e.data);
     if(m.type==='ready'&&side==='host'){
       const u=new URL(location.href);u.search='';u.hash='room='+code;
       link.href=u.href;link.textContent='초대 링크';window.drawInviteQR(qr,u.href);
       roomBox.hidden=false;message.textContent='상대 휴대폰 카메라로 QR을 스캔하세요.';
     }
     if(m.type==='start'){
       playing=true;batch=[];game.reset();roomBox.hidden=true;
       document.body.dataset.remote=side;
       document.querySelector('#restart').disabled=side==='guest';
       message.textContent=side==='host'?'연결됨 · 내 선수는 빨강':'연결됨 · 내 선수는 파랑';
     }else if(m.type==='key'&&side==='host')game.change(1,m.key,m.down);
     else if(m.type==='frames'&&side==='guest')for(const f of m.frames)game.advance(f);
     else if(m.type==='restart')game.reset();
   };
   ws.onclose=()=>{if(socket!==ws)return;local();message.textContent='연결이 종료됐어요. 새 QR 대전방을 만들 수 있어요.'};
   ws.onerror=()=>{message.textContent='방에 연결하지 못했어요. 초대 링크를 확인하세요.'};
 }
 host.onclick=()=>open(crypto.randomUUID().replaceAll('-',''),'host');
 leave.onclick=()=>{local();message.textContent='같은 화면 2인 대전'};
 const code=new URLSearchParams(location.hash.slice(1)).get('room');
 if(code&&/^[a-f0-9]{32}$/.test(code))open(code,'guest');
 return {online:()=>role!=='local',drives:()=>role==='local'||(role==='host'&&playing),
   input(k,down){if(!playing)return;if(role==='guest'){if(socket?.readyState===1)socket.send(JSON.stringify({type:'key',key:k,down}))}else game.change(0,k,down)},
   sendFrame(f){if(role==='host'&&playing&&socket?.readyState===1){batch.push(f);if(batch.length===4){socket.send(JSON.stringify({type:'frames',frames:batch}));batch=[]}}},
   restart(){if(role==='guest')return;if(role==='host'&&playing){batch=[];socket.send('{"type":"restart"}')}game.reset()}
 };
}

const base='wss://lounge-sports-room.fontory.workers.dev/';
export function connect(sport,game){
 let mode='local';
 const buttons=['#auto','#link-mode','#host','#practice','#local'].map(id=>document.querySelector(id));
 let socket=null,role='local',playing=false,batch=[];
 const roomBox=document.querySelector('#room'),qr=document.querySelector('#qr'),link=document.querySelector('#invite'),message=document.querySelector('#connection'),host=document.querySelector('#host'),leave=document.querySelector('#leave');
 function local(){
   const old=socket;socket=null;if(old)old.close();role='local';mode='local';playing=false;batch=[];game.reset();
   document.body.removeAttribute('data-remote');roomBox.hidden=true;buttons.forEach(b=>b.hidden=false);leave.hidden=true;
   document.querySelector('#restart').disabled=false;
   const u=new URL(location.href);u.hash='';history.replaceState(null,'',u);
 }
 function open(code,side,method){
   if(socket)return;
   role=side;playing=false;message.textContent='대전방 연결 중…';buttons.forEach(b=>b.hidden=true);leave.hidden=false;
   const ws=new WebSocket(base+(method==='auto'?'queue/'+sport:'room/'+sport+'/'+code+'?role='+side));socket=ws;
   ws.onmessage=e=>{
     if(socket!==ws)return;
     const m=JSON.parse(e.data);
     if(m.type==='ready'){
       role=m.role;
       if(method==='auto'){message.textContent='같은 종목의 상대를 찾는 중…';return}
       if(role!=='host')return;
       const u=new URL(location.href);u.search='';u.hash='room='+code;
       link.value=u.href;qr.hidden=method!=='qr';if(!qr.hidden)window.drawInviteQR(qr,u.href);
       roomBox.hidden=false;message.textContent=method==='qr'?'상대 휴대폰 카메라로 QR을 스캔하세요.':'초대 링크를 복사해 상대에게 보내세요.';
     }
     if(m.type==='start'){
       playing=true;batch=[];game.reset();roomBox.hidden=true;
       document.body.dataset.remote=role;
       document.querySelector('#restart').disabled=role==='guest';
       message.textContent=role==='host'?'연결됨 · 내 선수는 빨강':'연결됨 · 내 선수는 파랑';
     }else if(m.type==='key'&&role==='host')game.change(1,m.key,m.down);
     else if(m.type==='frames'&&role==='guest')for(const f of m.frames)game.advance(f);
     else if(m.type==='restart')game.reset();
   };
   ws.onclose=()=>{if(socket!==ws)return;local();message.textContent='연결이 종료됐어요. 새 QR 대전방을 만들 수 있어요.'};
   ws.onerror=()=>{message.textContent='방에 연결하지 못했어요. 초대 링크를 확인하세요.'};
 }
 function invite(method){open(crypto.randomUUID().replaceAll('-',''),'host',method)}
 host.onclick=()=>invite('qr');
 buttons[0].onclick=()=>open(null,'host','auto');
 buttons[1].onclick=()=>invite('link');
 buttons[3].onclick=()=>{local();mode='practice';document.body.dataset.remote='host';message.textContent='연습 · 컴퓨터 상대'};
 buttons[4].onclick=()=>{local();message.textContent='같은 화면 2인 대전'};
 document.querySelector('#copy-invite').onclick=async()=>{try{await navigator.clipboard.writeText(link.value);message.textContent='초대 링크를 복사했어요.'}catch{link.select();message.textContent='선택한 초대 링크를 복사하세요.'}};
 leave.onclick=()=>{local();message.textContent='같은 화면 2인 대전'};
 const code=new URLSearchParams(location.hash.slice(1)).get('room');
 if(code&&/^[a-f0-9]{32}$/.test(code))open(code,'guest','link');
 return {practice:()=>mode==='practice',online:()=>role!=='local',drives:()=>role==='local'||(role==='host'&&playing),
   input(k,down){if(!playing)return;if(role==='guest'){if(socket?.readyState===1)socket.send(JSON.stringify({type:'key',key:k,down}))}else game.change(0,k,down)},
   sendFrame(f){if(role==='host'&&playing&&socket?.readyState===1){batch.push(f);if(batch.length===4){socket.send(JSON.stringify({type:'frames',frames:batch}));batch=[]}}},
   restart(){if(role==='guest')return;if(role==='host'&&playing){batch=[];socket.send('{"type":"restart"}')}game.reset()}
 };
}

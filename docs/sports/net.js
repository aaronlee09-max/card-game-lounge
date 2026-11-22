import {clamp,ink} from './paint.js';
export function net(g){
 const ping=g.id==='table-tennis',shuttle=g.id==='badminton',volley=g.id==='volleyball';
 const floor=352,netTop=volley?194:shuttle?221:ping?290:261;
 const players=[{x:185,j:0,v:0},{x:655,j:0,v:0}];
 let server=0,last=0,bounces=0,waiting=true,ball;
 function serve(){waiting=true;last=server;bounces=0;ball={x:players[server].x,y:floor-74,vx:0,vy:0}}
 function award(i){
   g.score[i]++;const [a,b]=g.score;
   if(!ping&&!shuttle&&!volley){const labels=['0','15','30','40'];g.labels=a>=3&&b>=3?(a===b?['듀스','듀스']:a>b?['어드밴티지','40']:['40','어드밴티지']):[labels[a]||'게임',labels[b]||'게임']}
   const target=ping?11:shuttle?21:volley?15:4;
   if((g.score[i]>=target&&Math.abs(a-b)>=2)||(shuttle&&g.score[i]===30))return g.finish(i);
   server=ping?(Math.floor((a+b)/(a>=10&&b>=10?1:2))%2):i;serve();g.note((i?'파랑':'빨강')+' 득점 · '+(server?'파랑':'빨강')+' 서브')
 }
 serve();g.note('빨강 서브 · 동작 버튼');
 return {cpu(){
   const p=players[1],x=waiting?655:clamp(ball.x+ball.vx*8,445,795);
   return {left:p.x>x+9,right:p.x<x-9,up:volley&&Math.abs(x-p.x)<52&&g.time%37<4,act:waiting?server===1&&g.time%45<5:last===0&&Math.abs(p.x-ball.x)<65&&Math.abs(floor-60+p.j-ball.y)<75&&(!ping||bounces===1)&&g.time%8<4};
 },tick(){
   players.forEach((p,i)=>{
     const k=g.keys[i];p.x=clamp(p.x+(+k.right-+k.left)*5,i?438:42,i?798:400);
     if(volley&&g.tap[i].up&&p.j===0)p.v=-8.5;
     p.j=Math.min(0,p.j+p.v);p.v=p.j<0?p.v+.27:0;
   });
   if(waiting){ball.x=players[server].x;ball.y=floor-74}
   for(let i=0;i<2;i++){
     const p=players[i],serving=waiting&&server===i;
     if(!g.tap[i].act||(!serving&&(waiting||last===i||Math.abs(p.x-ball.x)>80||Math.abs(floor-60+p.j-ball.y)>85||(ping&&bounces!==1))))continue;
     const dir=i?-1:1;last=i;bounces=0;waiting=false;ball.x=p.x+18*dir;ball.y=Math.min(ball.y,floor-72+p.j);
     const target=i?(g.keys[i].down?300:160):(g.keys[i].down?540:680);
     const gravity=shuttle?.25:ping?.31:.24;
     ball.vy=volley&&p.j<-52&&!serving?-5:shuttle?-10:ping?-7:-9;
     const flight=(-ball.vy+Math.sqrt(ball.vy**2+2*gravity*(floor-ball.y)))/gravity;
     ball.vx=(target-ball.x)/flight*(shuttle?1.27:1);
   }
   if(waiting)return;
   const before=ball.x;ball.x+=ball.vx;ball.y+=ball.vy;ball.vy+=shuttle?.25:ping?.31:.24;if(shuttle)ball.vx*=.995;
   if((before-420)*(ball.x-420)<=0&&ball.y>netTop){award(1-last);return}
   if(ball.y>=floor){const side=ball.x<420?0:1;if(ball.x<33||ball.x>807||side===last){award(bounces?last:1-last);return}
     if(shuttle||volley||bounces){award(last);return}
     bounces++;ball.y=floor;ball.vy=-Math.abs(ball.vy)*.76;
   }
   if(ball.x<0||ball.x>840)award(bounces?last:1-last)
 },draw(d){
   d.rect(0,0,840,440,volley?'#e4bb75':ping?'#172f4b':shuttle?'#245e56':'#264b64');
   d.rect(32,floor,776,26,volley?'#c99850':ping?'#62afbd':'#71aba3');d.line(32,floor,808,floor,ink,4);
   d.line(420,netTop,420,floor,'#eef6f1',5);for(let y=netTop+5;y<floor;y+=9)d.line(410,y,428,y,'#d4e8e6',1);
   if(ping)for(const x of [100,740])d.line(x,floor+26,x,421,'#abbac7',8);
   players.forEach((p,i)=>{const y=floor-20+p.j,dir=i?-1:1;d.athlete(p.x,y,i);d.line(p.x,y,p.x+20*dir,y-25,ink,3);if(!volley)d.circle(p.x+21*dir,y-30,ping?9:14,ping?'#e96546':ink,!ping)});
   if(shuttle)d.line(ball.x,ball.y,ball.x-ball.vx*1.6,ball.y-ball.vy*1.5,ink,7);
   d.circle(ball.x,ball.y,volley?10:ping?4:6,volley?'#ffdc62':ping?ink:'#dcfa6e');
 }};
}

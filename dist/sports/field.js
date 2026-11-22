import {clamp,ink,red,blue} from './paint.js';
export function field(g){
 const hockey=g.id==='ice-hockey',water=g.id==='water-polo',hand=g.id==='handball';
 const surface=hockey?'#d8ebef':water?'#187d9a':hand?'#397f98':'#337849';
 const friction=hockey?.98:water?.76:.83, drag=hockey?.995:water?.93:.976;
 const players=[0,1].map(i=>({x:i?620:220,y:220,vx:0,vy:0,angle:i?Math.PI:0,power:0}));
 let ball,owner=-1,free=0,held=0;
 function serve(){ball={x:420,y:220,vx:0,vy:0};owner=-1;held=0;free=0;players.forEach((p,i)=>Object.assign(p,{x:i?620:220,y:220,vx:0,vy:0,power:0}))}
 serve();
 return {cpu(){
   const p=players[1],x=owner===1?35:ball.x,y=owner===1?220:ball.y;
   return {left:p.x>x+5,right:p.x<x-5,up:p.y>y+5,down:p.y<y-5,act:owner===1?(p.x>270||g.time%65<39):g.time%40<10};
 },tick(){
   free--;held++;
   players.forEach((p,i)=>{
     const k=g.keys[i],dx=+k.right-+k.left,dy=+k.down-+k.up;
     if(dx||dy)p.angle=Math.atan2(dy,dx);
     const accel=hockey?.21:water?.64:.83;
     p.vx=clamp(p.vx*friction+dx*accel,-5.3,5.3);p.vy=clamp(p.vy*friction+dy*accel,-5.3,5.3);
     p.x=clamp(p.x+p.vx,35,805);p.y=clamp(p.y+p.vy,48,392);
     if(hand&&Math.hypot(p.x-(i?32:808),p.y-220)<85)p.x=i?118:722;
     if(k.act)p.power=Math.min(55,p.power+1);
     if(owner!==i&&free<=0&&Math.hypot(p.x-ball.x,p.y-ball.y)<20&&(owner<0||g.tap[i].act)){owner=i;held=0;free=18}
     if(g.release[i].act&&owner===i){
       const speed=6+p.power*.17;ball.vx=Math.cos(p.angle)*speed;ball.vy=Math.sin(p.angle)*speed;
       owner=-1;free=14;
     }
     if(!k.act)p.power=0;
   });
   if(owner>=0){
     const p=players[owner];ball.x=p.x+15*Math.cos(p.angle);ball.y=p.y+15*Math.sin(p.angle);
     if(hand&&held>180){owner=-1;free=40;ball.vy=3;g.note('3초 바이얼레이션 · 루즈볼')}
   }else{
     ball.x+=ball.vx;ball.y+=ball.vy;ball.vx*=drag;ball.vy*=drag;
   }
   const opening=hockey?39:water?61:51;
   if(ball.x<32||ball.x>808){
     if(Math.abs(ball.y-220)<opening){const i=ball.x<32?1:0;g.score[i]++;g.note((i?'파랑':'빨강')+' 골!');if(g.score[i]===5)g.finish(i);else serve();return}
     ball.x=clamp(ball.x,32,808);ball.vx*=-.8;
   }
   if(ball.y<40||ball.y>400){ball.y=clamp(ball.y,40,400);ball.vy*=-.8}
 },draw(d){
   d.rect(0,0,840,440,surface);
   if(!hockey&&!hand&&!water)for(let x=30;x<800;x+=100)d.rect(x,40,50,360,'#ffffff0b');
   if(water)for(let y=50;y<400;y+=24)for(let x=40;x<805;x+=38)d.line(x,y,x+17,y-2,'#a1f2fb44');
   const mark=hockey?'#a43148':ink;
   for(const x of [32,808]){d.line(x,40,x,400,mark);d.circle(x,220,75,mark,true);d.rect(x===32?9:808,173,23,94,'#e6f2f369')}
   d.line(32,40,808,40,mark);d.line(32,400,808,400,mark);d.line(420,40,420,400,mark);d.circle(420,220,45,mark,true);
   if(hockey) for(const x of [265,575])d.line(x,40,x,400,'#4286cc',4);
   players.forEach((p,i)=>{d.athlete(p.x,p.y,i);if(hockey)d.line(p.x,p.y,p.x+22*Math.cos(p.angle),p.y+22*Math.sin(p.angle),'#70492a',4);if(p.power)d.rect(p.x-15,p.y-23,p.power*.55,3,i?blue:red)});
   d.circle(ball.x+2,ball.y+2,7,'#17242d4d');d.circle(ball.x,ball.y,hockey?5:7,hockey?'#181f25':water?'#f4ca22':hand?'#ef953c':ink);
 }};
}

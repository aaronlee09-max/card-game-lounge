import {clamp,ink,red,blue} from './paint.js';
const sectors=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
export function precision(g){
 const id=g.id,golf=id==='mini-golf',curl=id==='curling',bowl=id==='bowling',hoop=id==='basketball',arch=id==='archery',dart=id==='darts';
 let turn=0,shots=[0,0],aimX=0,aimY=0,power=0,ball=null,history=[],pins=[],roll=0,downPins=0;
 let hole=0,strokes=[0,0],positions=[],done=[false,false];
 const cup=()=>({x:650+hole*36,y:140+hole*55});
 const wind=()=>Math.sin((shots[0]+shots[1]+1)*2.7)*19;
 function golfSetup(){positions=[{x:145,y:320},{x:145,y:320}];strokes=[0,0];done=[false,false]}
 function rack(){pins=[];for(let row=0;row<4;row++)for(let n=0;n<=row;n++)pins.push({x:656+row*18,y:220+(n-row/2)*22,up:true})}
 function hint(){g.note((turn?'파랑':'빨강')+' 차례 · '+(golf?(hole+1)+'번 홀':bowl?(Math.floor(shots[turn])+1)+'프레임 · '+(roll+1)+'구':(shots[turn]+1)+'번째 시도'))}
 function end(){
   const a=g.score[0],b=g.score[1];g.finish(a===b?-1:(golf?a<b:a>b)?0:1);
 }
 function next(){
   ball=null;power=0;aimX=aimY=0;
   if(golf){
     if(done.every(Boolean)){if(++hole===3)return end();golfSetup();turn=0}
     else if(!done[1-turn])turn=1-turn;
   }else{
     if(bowl&&roll===0&&pins.some(p=>p.up)){roll=1;hint();return}
     if(bowl){roll=0;rack()}
     shots[turn]++;
     if(shots[0]===shots[1]&&shots[0]>=(hoop?5:3)){
       if(curl){
         const ranks=history.map(p=>({...p,dist:Math.hypot(p.x-650,p.y-220)})).filter(p=>p.dist<=82).sort((a,b)=>a.dist-b.dist);
         if(ranks.length){const best=ranks[0].team,other=ranks.find(p=>p.team!==best);g.score[best]=ranks.filter(p=>p.team===best&&(!other||p.dist<other.dist)).length}
       }
       return end();
     }
     turn=1-turn;
   }
   hint();
 }
 rack();golfSetup();hint();
 function launch(){
   const strength=clamp(power/75,.05,1);
   if(arch||dart){
     const x=420+aimX+Math.sin(g.time*.06)*7+(arch?wind()*(1-strength):0);
     const y=215+aimY+Math.cos(g.time*.07)*6+(1-strength)*(arch?52:17);
     const r=Math.hypot(x-420,y-215);
     let points=0;
     if(arch)points=clamp(10-Math.floor(r/13),0,10);
     else if(r<6)points=50;else if(r<14)points=25;else if(r<=140){
       const angle=(Math.atan2(x-420,215-y)+Math.PI*2+Math.PI/20)%(Math.PI*2);
       points=sectors[Math.floor(angle/(Math.PI/10))]*(r>131?2:r>77&&r<87?3:1);
     }
     history.push({x,y,team:turn});g.score[turn]+=points;ball={x,y,rest:38};return;
   }
   if(hoop){
     const angle=(51+aimY*.17)*Math.PI/180,speed=8+strength*9;
     ball={x:170,y:318,vx:Math.cos(angle)*speed,vy:-Math.sin(angle)*speed,scored:false};return;
   }
   const start=golf?positions[turn]:{x:110,y:220+aimX};
   const angle=golf?-.32+aimX*.009:aimY*.0016;
   const speed=golf?2+strength*13:curl?3+strength*8:4+strength*12;
   ball={...start,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,team:turn,curve:aimY*.00035};
   if(golf){strokes[turn]++;g.score[turn]++}
 }
 return {cpu(){
   const phase=g.time%95;
   return {left:golf&&phase<10&&aimX>-19,up:hoop&&phase<19&&aimY>-34,act:turn===1&&(ball?curl:phase<(hoop?69:curl?66:56))};
 },tick(){
   const k=g.keys[turn];
   if(!ball){
     aimX=clamp(aimX+(+k.right-+k.left)*2,-155,155);
     aimY=clamp(aimY+(+k.down-+k.up)*2,-140,140);
     if(k.act)power=Math.min(75,power+1);
     if(g.release[turn].act){launch();power=0}
     return;
   }
   if(ball.rest!==undefined){if(--ball.rest<=0)next();return}
   const b=ball,prevY=b.y;b.x+=b.vx;b.y+=b.vy;
   if(hoop){
     b.vy+=.235;
     if(!b.scored&&b.vy>0&&prevY<178&&b.y>=178&&Math.abs(b.x-635)<24){g.score[turn]++;b.scored=true}
     if(b.x>=670&&b.x<687&&b.y>90&&b.y<184){b.x=668;b.vx=-Math.abs(b.vx)*.72}
     if(b.y>370||b.x>850||b.x<0)next();return;
   }
   if(bowl){
     b.vy+=b.curve;
     if(b.y>85&&b.y<355)for(const p of pins)if(p.up&&Math.hypot(p.x-b.x,p.y-b.y)<21){
       p.up=false;g.score[turn]++;
       for(const q of pins)if(q.up&&q.x>p.x&&q.x-p.x<40&&Math.abs(q.y-p.y-b.vy)<15){q.up=false;g.score[turn]++}
     }
     if(b.x>790)next();return;
   }
   const friction=curl?(k.act?.991:.986):.978;
   b.vx*=friction;b.vy*=friction;
   if(golf){
     if(b.x<66||b.x>775){b.x=clamp(b.x,66,775);b.vx*=-.78}
     if(b.y<62||b.y>368){b.y=clamp(b.y,62,368);b.vy*=-.78}
     const wallY=90+hole*26;
     if(b.x>399&&b.x<423&&b.y>=wallY&&b.y<=wallY+125){b.x=b.vx>0?398:424;b.vx*=-.75}
     if(Math.hypot(b.x-cup().x,b.y-cup().y)<13&&Math.hypot(b.vx,b.vy)<5){done[turn]=true;next();return}
   }else{
     for(const s of history){const dx=s.x-b.x,dy=s.y-b.y,dist=Math.hypot(dx,dy);if(dist>0&&dist<22){
       const impulse=Math.max(0,(b.vx*dx+b.vy*dy)/dist);s.x+=dx/dist*(22-dist+impulse*5);s.y+=dy/dist*(22-dist+impulse*5);b.vx*=.55;b.vy*=.55
     }}
   }
   if(Math.hypot(b.vx,b.vy)<.12||b.x>806||b.y<41||b.y>399){
     if(curl&&b.x<=806&&b.y>=41&&b.y<=399)history.push({x:b.x,y:b.y,team:turn});
     if(golf){positions[turn]={x:b.x,y:b.y};if(strokes[turn]>=8)done[turn]=true}
     next();
   }
 },draw(d){
   d.rect(0,0,840,440,golf?'#286653':curl?'#cce4eb':bowl?'#533931':hoop?'#91664b':'#22333b');
   const color=turn?blue:red;
   if(arch||dart){
     if(arch){for(let n=10;n>0;n--)d.circle(420,215,n*13,['#e9bd31','#db4240','#3e9dc8','#242a30','#e9e4d7'][Math.floor((n-1)/2)]);d.text(28,45,'바람 '+wind().toFixed(0),ink)}
     else{
       for(let i=0;i<20;i++){
         const a=(i-.5)*Math.PI/10-Math.PI/2;
         for(const [r,w,col] of [[140,140,i%2?'#e5d5ae':'#272828'],[136,8,i%2?'#c53f43':'#168566'],[82,9,i%2?'#c53f43':'#168566']]){
           const ctx=g.ctx;ctx.beginPath();ctx.arc(420,215,r-w/2,a,a+Math.PI/10);ctx.strokeStyle=col;ctx.lineWidth=w;ctx.stroke();
         }
         d.text(413+Math.cos(i*Math.PI/10-Math.PI/2)*159,221+Math.sin(i*Math.PI/10-Math.PI/2)*159,String(sectors[i]),ink,14)
       }d.circle(420,215,14,'#268561');d.circle(420,215,6,'#d14545');
     }
     for(const p of history)d.circle(p.x,p.y,4,p.team?blue:red);
     const x=420+aimX+Math.sin(g.time*.06)*7,y=215+aimY+Math.cos(g.time*.07)*6;
     d.line(x-10,y,x+10,y,'white');d.line(x,y-10,x,y+10,'white');
   }else if(hoop){
     d.rect(0,367,840,73,'#bd9862');d.line(670,88,670,180,ink,6);d.line(606,177,664,177,'#f65932',5);
     for(let x=607;x<660;x+=9)d.line(x,179,626+(x-607)*.45,205,ink,1);
     d.athlete(160,345,turn);d.line(172,317,172+44*Math.cos((51+aimY*.17)*Math.PI/180),317-44*Math.sin((51+aimY*.17)*Math.PI/180),ink);
     d.circle(ball?.x??170,ball?.y??318,9,'#e99139');
   }else if(bowl){
     d.rect(45,80,750,280,'#d3aa75');for(let y=88;y<355;y+=17)d.line(45,y,795,y,'#987247',1);
     for(const p of pins)if(p.up){d.circle(p.x,p.y,8,ink);d.line(p.x-4,p.y,p.x+4,p.y,'#d74443',2)}
     d.circle(ball?.x??110,ball?.y??220+aimX,11,color);
   }else if(curl){
     for(const x of [120,650])for(const [r,c] of [[82,'#477bb5'],[56,ink],[30,'#c53f43'],[10,ink]])d.circle(x,220,r,c);
     d.line(35,220,805,220,'#36445255',1);d.line(425,45,425,395,'#c85b52',4);
     for(const p of [...history,ball??{x:110,y:220+aimX,team:turn}]){d.circle(p.x,p.y,11,'#53616a');d.line(p.x-5,p.y,p.x+5,p.y,p.team?blue:red,5)}
   }else{
     d.rect(60,56,720,318,'#74a257');d.rect(399,90+hole*26,24,125,'#ab9270');d.circle(cup().x,cup().y,12,'#152c26');d.line(cup().x,cup().y,cup().x,cup().y-32,ink);d.rect(cup().x,cup().y-32,18,9,red);
     const p=ball??positions[turn];d.circle(p.x,p.y,7,ink);if(!ball)d.line(p.x,p.y,p.x+48*Math.cos(-.32+aimX*.009),p.y+48*Math.sin(-.32+aimX*.009),ink);
   }
   d.rect(28,412,152,9,'#263138');d.rect(28,412,power*2,9,color);
 }};
}

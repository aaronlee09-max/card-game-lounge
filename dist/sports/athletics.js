import {clamp,ink,red,blue} from './paint.js';
export function race(g){
 const row=g.id==='rowing',bike=g.id==='cycling',ice=g.id==='speed-skating';
 const length=row?250:bike?400:ice?200:100;
 const racers=[0,1].map(()=>({m:0,v:0,last:-100,side:'',hold:0,energy:100}));
 return {tick(){
   racers.forEach((p,i)=>{
     const taps=g.tap[i],k=g.keys[i],gap=g.time-p.last;
     if(row){
       if(k.act)p.hold=Math.min(75,p.hold+1);
       if(g.release[i].act){p.v+=Math.max(.06,.58-Math.abs(36-p.hold)*.014)*(gap>45?1:.5);p.hold=0;p.last=g.time}
     }else{
       const side=taps.left?'left':taps.right?'right':'';
       const beat=bike?10:ice?29:13;
       if(side&&side!==p.side&&gap>=5){
         const rhythm=Math.max(.14,1-Math.abs(Math.min(gap,45)-beat)/(beat*1.7));
         p.v+=(ice?.33:bike?.22:.15)*rhythm;p.side=side;p.last=g.time;
       }
       if(bike){if(k.act&&p.energy>1){p.v+=.012;p.energy-=.4}else if(!k.act)p.energy=Math.min(100,p.energy+.12)}
     }
     p.v=clamp(p.v*(row?.989:ice?.992:bike?.984:.966),0,bike?1.4:row?.95:.8);p.m+=p.v;
     g.labels[i]=Math.min(length,p.m).toFixed(1)+' m';
   });
   if(racers.some(p=>p.m>=length))g.finish(Math.abs(racers[0].m-racers[1].m)<.001?-1:racers[0].m>racers[1].m?0:1)
 },draw(d){
   d.rect(0,0,840,440,row?'#246d85':ice?'#add6de':bike?'#ad8354':'#a64e43');
   for(let lane=0;lane<2;lane++){
     const y=140+lane*160,p=racers[lane],x=52+720*Math.min(1,p.m/length),color=lane?blue:red;
     d.line(32,y+57,810,y+57,ink);
     for(let n=0;n<=10;n++)d.line(52+72*n,y+49,52+72*n,y+57,ink);
     if(row){d.line(x-24,y,x+24,y,'#f5eee0',8);d.line(x-13,y-14,x+13,y+14,color,3)}
     if(bike){d.circle(x-12,y+8,10,ink,true);d.circle(x+12,y+8,10,ink,true);d.line(x-12,y+8,x,y-4,color,3);d.line(x,y-4,x+12,y+8,color,3)}
     d.athlete(x,y-5,lane,Math.sin(p.m*2)*4);
     if(ice)d.line(x-10,y+8,x+14,y+8,'#52697b',2);
     if(bike)d.rect(x-18,y-25,p.energy*.36,4,'#f1df75');
     if(row)d.rect(x-18,y-25,p.hold*.5,4,'#f1df75');
   }d.line(774,68,774,380,ink,4);d.text(710,49,length+' m',ink);
 }};
}
export function duel(g){
 const sword=g.id==='fencing';let fighters;
 function reset(){fighters=[0,1].map(i=>({x:i?570:270,guard:0,energy:100,hp:100,attack:0,cool:0,hit:false}))}
 reset();
 return {tick(){
   fighters.forEach((p,i)=>{
     const k=g.keys[i];p.cool--;p.attack=Math.max(0,p.attack-1);p.guard=Math.max(0,p.guard-1);
     const dir=i?-1:1,q=fighters[1-i];
     const step=(+k.right-+k.left)*(sword?3.6:3.0);
     p.x=clamp(p.x+step,i?q.x+42:40,i?800:q.x-42);
     if(sword&&g.tap[i].down)p.guard=12;
     if(!sword)p.guard=k.down&&p.energy>=1?2:0;
     p.energy=clamp(p.energy+(p.guard?-.15:.28),0,100);
     if(g.tap[i].act&&p.cool<=0&&p.energy>=14){p.attack=sword?16:11;p.cool=sword?36:20;p.hit=false;p.energy-=14;p.x=clamp(p.x+dir*(sword?12:5),40,800)}
   });
   const hits=fighters.map((p,i)=>{const q=fighters[1-i];if(p.hit||p.attack!==(sword?10:7)||Math.abs(q.x-p.x)>(sword?118:69))return 0;
     p.hit=true;if(q.guard){if(sword)p.cool=48;return 0}return 1});
   if(sword&&hits.some(Boolean)){
     if(hits[0]!==hits[1]){const i=hits[0]?0:1;g.score[i]++;if(g.score[i]>=5)return g.finish(i);g.note((i?'파랑':'빨강')+' 터치')}
     else g.note('동시타 · 다시 앙가르드');reset();
   }else if(!sword){
     for(let i=0;i<2;i++){fighters[i].hp=Math.max(0,fighters[i].hp-hits[1-i]*12);g.labels[i]='HP '+fighters[i].hp}
     if(fighters.some(p=>!p.hp))g.finish(fighters[0].hp===fighters[1].hp?-1:fighters[0].hp?0:1);
   }
 },draw(d){
   d.rect(0,0,840,440,sword?'#29364a':'#253344');
   d.rect(30,266,780,59,sword?'#b1aca1':'#5985a2');
   if(!sword)for(const y of [180,215,250])d.line(27,y,813,y,y===215?ink:red,4);
   fighters.forEach((p,i)=>{const dir=i?-1:1,col=i?blue:red;d.line(p.x,246,p.x-16,284,'#303640',8);d.line(p.x,246,p.x+16,284,'#303640',8);
     d.line(p.x,240,p.x,203,sword?ink:col,19);d.circle(p.x,187,12,sword?'#9aa9ad':'#dfb389');
     const reach=p.attack?(sword?56:45):p.guard?12:22,h=p.guard?189:213;
     d.line(p.x,205,p.x+reach*dir,h,col,7);
     if(sword)d.line(p.x+reach*dir,h,p.x+(reach+60)*dir,h-6,'#eaf4ff',2);else d.circle(p.x+reach*dir,h,9,col);
     d.rect(p.x-20,160,p.energy*.4,4,'#ecd16a');
   });
 }};
}

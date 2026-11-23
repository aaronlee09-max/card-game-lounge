import {painter} from './paint.js';
import {field} from './field.js';
import {net} from './net.js';
import {precision} from './precision.js';
import {race,duel} from './athletics.js';
import {connect} from './match.js';

const list=await (await fetch(new URL('./catalog.json',import.meta.url))).json();
const [id,name,group]=list.find(([slug])=>location.pathname.split('/').includes(slug));
const court=document.querySelector('#court');
const display=painter(court.getContext('2d'));
const names=['up','left','down','right','act'];
const keys=[['w','a','s','d','f'],['ArrowUp','ArrowLeft','ArrowDown','ArrowRight','Enter']];
const create={football:field,goal:field,net,precision,race,duel}[group];
let held=[0,0],pressed=[0,0],released=[0,0],g,game;
function reset(){
 held=[0,0];pressed=[0,0];released=[0,0];
 g={id,time:0,ctx:court.getContext('2d'),score:[0,0],labels:[],over:false,
   note:s=>document.querySelector('#status').textContent=s,
   finish(i){this.over=true;this.note(i<0?'무승부':(i?'파랑':'빨강')+' 승리!')}};
 g.note(name+' 경기 시작');game=create(g);paint();
}
function paint(){game.draw(display);['red','blue'].forEach((s,i)=>document.querySelector('#'+s).textContent=(i?'파랑 ':'빨강 ')+(g.labels[i]??g.score[i]))}
function change(i,key,down){
 const bit=1<<key;
 if(Boolean(held[i]&bit)===down)return;
 if(down){held[i]|=bit;pressed[i]|=bit}else{held[i]&=~bit;released[i]|=bit}
}
function frame(){
 const result=[...held,...pressed,...released];pressed=[0,0];released=[0,0];return result;
}
function decode(n){return Object.fromEntries(names.map((key,i)=>[key,Boolean(n&(1<<i))]))}
function advance(f){
 if(g.over)return;
 g.keys=[decode(f[0]),decode(f[1])];g.tap=[decode(f[2]),decode(f[3])];g.release=[decode(f[4]),decode(f[5])];g.time++;game.tick();
}
reset();
const match=connect(id,{reset,change,advance});
function input(i,key,down){if(match.online())match.input(key,down);else if(!match.practice()||i===0)change(i,key,down)}
const actions={
 football:'슈팅', 'ice-hockey':'슬랩샷', handball:'던지기', 'water-polo':'슛',
 tennis:'스트로크', 'table-tennis':'타구', badminton:'스매시', volleyball:'스파이크',
 basketball:'자유투', archery:'시위 당기기', bowling:'투구', curling:'투구 / 스위핑',
 darts:'던지기', 'mini-golf':'퍼팅', cycling:'스프린트', rowing:'스트로크', fencing:'런지', boxing:'잽'
};
const rhythm=['sprint','cycling','speed-skating'].includes(id);
const charged=['football','ice-hockey','handball','water-polo','basketball','archery','bowling','curling','darts','mini-golf','rowing'].includes(id);
const gestureHelp=document.createElement('p');
gestureHelp.className='gesture-help';
gestureHelp.textContent=rhythm?'좌우로 번갈아 밀어 리듬을 맞추세요.':'방향 패드를 밀고 유지하면 이동하거나 조준해요. '+(charged?'동작 패드를 아래로 당겨 힘을 모으고 놓으세요.':'동작 패드를 위로 짧게 밀어 공격하세요.');
document.querySelector('.controls').before(gestureHelp);
document.querySelectorAll('fieldset').forEach((pad,i)=>{
 const legend=pad.querySelector('legend');
 const surface=document.createElement('div');
 surface.className='swipe-surface';
 surface.innerHTML='<span>↑</span><span>←　●　→</span><span>↓</span>';
 surface.setAttribute('aria-label',rhythm?'좌우로 번갈아 밀기':'방향 조작 패드');
 pad.replaceChildren(legend,surface);
 if(actions[id]){
   const stroke=document.createElement('div');
   stroke.className='swipe-surface swipe-action';
   stroke.textContent=actions[id]+' '+(charged?'↓ 당겼다 놓기':'↑ 밀기');
   pad.append(stroke);
   let pointer=null, start=0, active=false;
   const end=e=>{if(pointer!==e.pointerId)return;pointer=null;if(active)input(i,4,false);active=false};
   stroke.onpointerdown=e=>{if(pointer!==null)return;pointer=e.pointerId;start=e.clientY;stroke.setPointerCapture(pointer)};
   stroke.onpointermove=e=>{if(e.pointerId!==pointer||active)return;if((e.clientY-start)*(charged?1:-1)<14)return;active=true;input(i,4,true)};
   stroke.onpointerup=stroke.onpointercancel=stroke.onlostpointercapture=end;
 }
 let pointer=null,x=0,y=0;
 const directions=[false,false,false,false];
 function steer(next){next.forEach((down,k)=>{if(directions[k]!==down){directions[k]=down;input(i,k,down)}})}
 const end=e=>{if(pointer!==e.pointerId)return;pointer=null;steer([false,false,false,false]);surface.style.removeProperty('--swipe-x');surface.style.removeProperty('--swipe-y')};
 surface.onpointerdown=e=>{if(pointer!==null)return;pointer=e.pointerId;x=e.clientX;y=e.clientY;surface.setPointerCapture(pointer)};
 surface.onpointermove=e=>{
   if(pointer!==e.pointerId)return;
   const dx=e.clientX-x,dy=e.clientY-y;
   steer([!rhythm&&dy<-13,dx<-13,!rhythm&&dy>13,dx>13]);
   surface.style.setProperty('--swipe-x',Math.max(-25,Math.min(25,dx))+'px');
   surface.style.setProperty('--swipe-y',Math.max(-20,Math.min(20,dy))+'px');
 };
 surface.onpointerup=surface.onpointercancel=surface.onlostpointercapture=end;
});
function keyboard(e,down){if(e.target.matches('input,textarea'))return;
 for(let i=0;i<2;i++){const key=keys[i].indexOf(e.key.length===1?e.key.toLowerCase():e.key);
 if(key>=0){e.preventDefault();if(!e.repeat)input(i,key,down);return}}
}
window.addEventListener('keydown',e=>keyboard(e,true));window.addEventListener('keyup',e=>keyboard(e,false));
window.addEventListener('blur',()=>{for(let i=0;i<2;i++)for(let k=0;k<5;k++)input(i,k,false)});
document.querySelector('#restart').onclick=()=>match.restart();
let previous=performance.now(),carry=0;
function loop(now){
 carry+=Math.min(80,now-previous);previous=now;
 while(carry>=1000/60){carry-=1000/60;if(match.drives()){if(match.practice()&&!g.over){const ai=game.cpu();names.forEach((name,k)=>change(1,k,Boolean(ai[name])))}const f=frame();advance(f);match.sendFrame(f)}}
 paint();requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

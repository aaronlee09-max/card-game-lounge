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
function input(i,key,down){if(match.online())match.input(key,down);else change(i,key,down)}
document.querySelectorAll('fieldset').forEach((pad,i)=>pad.querySelectorAll('button').forEach(button=>{
 const key=names.indexOf(button.dataset.control);
 button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);input(i,key,true)});
 button.addEventListener('lostpointercapture',()=>input(i,key,false));
 button.addEventListener('pointercancel',()=>input(i,key,false));
 button.addEventListener('pointerup',()=>input(i,key,false));
}));
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
 while(carry>=1000/60){carry-=1000/60;if(match.drives()){const f=frame();advance(f);match.sendFrame(f)}}
 paint();requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

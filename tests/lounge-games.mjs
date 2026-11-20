import{readFileSync}from'node:fs';import vm from'node:vm';import assert from'node:assert/strict';
const B=vm.runInNewContext(readFileSync('dist/board-rules.js','utf8')+';BoardRules',{structuredClone,Date});
const L=vm.runInNewContext(readFileSync('dist/lounge-rules.js','utf8')+';LoungeRules',{structuredClone,Date});
const ctx={window:{}};vm.runInNewContext(readFileSync('dist/vendor/chess.js','utf8'),ctx);const Chess=ctx.window.Chess;
for(const n of [2,3,4]){const s=B.create('rummikub','A',n);assert.equal(s.hands.length,n);assert.equal(s.deck.length,106-14*n);assert.equal(new Set([...s.deck,...s.hands.flat()]).size,106);assert.equal(s.hands[0].length,14);B.move(s,0,{action:'draw'});assert.equal(s.turn,1)}
let r=B.create('rummikub');r.tiles={0:{n:8,c:0},1:{n:9,c:0},2:{n:10,c:0},3:{n:0,c:4}};r.hands=[[0,1,2,3],[4]];r.deck=[];assert.equal(B.move(r,0,{action:'meld',sets:[[0,1,3]]}),false);assert.equal(r.opened[0],false);assert.equal(B.move(r,0,{action:'meld',sets:[[1,2,3]]}),true);assert.equal(r.opened[0],true);assert.equal(r.hands[0].length,1);assert.equal(B.setValue([0,0,3],r.tiles),0);assert.equal(B.setValue([1,2,3],r.tiles),30); // joker may fill 9
let j=B.create('jenga','A',1);assert.equal(B.move(j,0,{action:'pull',row:17,slot:0}),false);assert.equal(B.move(j,0,{action:'pull',row:0,slot:1}),true);assert.equal(B.move(j,0,{action:'place',slot:1}),true);assert.equal(j.turn,0);assert.equal(j.layers.flat().filter(n=>n!==null).length,54);assert.equal(j.scores[0],1);
j=B.create('jenga','A',3);j.layers[0]=[null,1,null];assert.equal(B.move(j,0,{action:'pull',row:0,slot:1}),true);assert.equal(j.turn,-1);
for(const n of [2,3,4]){const h=B.create('halli-galli','A',n);assert.equal(h.hands.flat().length,56);assert.equal(h.piles.length,n)}
let h=B.create('halli-galli','A',3);h.hands=[[1,2,3].map(n=>({fruit:0,n})),[{fruit:1,n:1}],[{fruit:2,n:2}]];h.piles=[[{fruit:0,n:2}],[{fruit:0,n:2}],[]];assert.equal(B.five(h),false);assert.equal(B.move(h,0,{action:'bell'}),true);assert.equal(h.turn,0);assert.deepEqual(Array.from(h.hands,h=>h.length),[1,2,2]);h.piles[1]=[{fruit:0,n:3}];h.revealedAt=Date.now()-300;assert.equal(B.move(h,1,{action:'bell'}),true);assert.ok(h.reaction>=300);assert.equal(h.piles.flat().length,0);
let c=new Chess();for(const m of ['f3','e5','g4','Qh4#'])c.move(m);assert.equal(c.isCheckmate(),true);
c=new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');assert.equal(c.isStalemate(),true);assert.equal(c.isCheck(),false);
c=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');c.move('O-O');assert.equal(c.get('f1').type,'r');assert.equal(c.get('g1').type,'k');
c=new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');c.move('exd6');assert.equal(c.get('d5'),undefined);
c=new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1');c.move({from:'a7',to:'a8',promotion:'n'});assert.equal(c.get('a8').type,'n');
c=new Chess('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1');assert.throws(()=>c.move('Rd2'));assert.ok(L.chessBot(c,2));
let g=L.gomoku(true);assert.equal(L.gomokuMove(g,0),false);assert.equal(L.gomokuMove(g,112),true);
const board=()=>Array(225).fill(0),at=(r,c)=>r*15+c;
let b=board();for(const [r,c]of [[7,6],[7,8],[6,7],[8,7]])b[at(r,c)]=1;assert.equal(L.forbidden(b,112),'double-three');assert.equal(b[112],0);
b=board();for(const [r,c]of [[7,5],[7,6],[7,8],[5,7],[6,7],[8,7]])b[at(r,c)]=1;assert.equal(L.forbidden(b,112),'double-four');
b=board();for(const c of [3,4,5,6,8])b[at(7,c)]=1;assert.equal(L.forbidden(b,112),'overline');
b=board();for(const c of [3,4,5,6])b[at(7,c)]=1;assert.equal(L.forbidden(b,112),null); // winning five overrides a foul
b=board();for(const [r,c]of [[0,6],[0,8],[1,7],[2,7]])b[at(r,c)]=1;assert.equal(L.forbidden(b,at(0,7)),null); // edge is not an open three
for(const n of [2,3,4]){const d=L.domino(n);assert.equal(new Set([...d.stock,...d.hands.flat()]).size,28);assert.equal(d.hands.length,n)}
let d=L.domino(2);d.tiles=[{a:1,b:2},{a:2,b:6},{a:3,b:3}];d.stock=[];d.hands=[[1],[2]];d.chain=[{id:0,a:1,b:2}];assert.equal(L.dominoMove(d,0,{action:'pass'}),false);assert.equal(L.dominoMove(d,0,{action:'play',id:1,end:'left'}),false);assert.equal(L.dominoMove(d,0,{action:'play',id:1,end:'right'}),true);assert.equal(d.chain.at(-1).b,6);assert.equal(d.winner,0);assert.equal(d.scores[0],6);
d=L.domino(2);d.tiles=[{a:1,b:1},{a:2,b:2},{a:3,b:3}];d.stock=[];d.hands=[[1],[2]];d.chain=[{id:0,a:1,b:1}];assert.equal(L.dominoMove(d,0,{action:'pass'}),true);assert.equal(L.dominoMove(d,1,{action:'pass'}),true);assert.equal(d.winner,0);
for(const level of ['easy','normal','hard']){const m=L.memory(level);assert.equal(new Set(m.cards).size,m.cards.length/2);assert.equal(m.started,null);assert.equal(L.memoryFlip(m,0,100),true);assert.equal(L.memoryFlip(m,0,110),false);const other=m.cards.findIndex(n=>n!==m.cards[0]);L.memoryFlip(m,other,200);assert.equal(m.locked,true);assert.equal(L.memoryFlip(m,2,250),false);L.memoryClose(m);for(let value=0;value<m.cards.length/2;value++){const pair=m.cards.map((v,i)=>v===value?i:-1).filter(i=>i>=0);L.memoryFlip(m,pair[0],300+value);L.memoryFlip(m,pair[1],400+value)}assert.ok(m.ended!==null);assert.equal(m.matched.length,m.cards.length)}
console.log('Seven new games: tile ownership/30 points/jokers, 1–4 player tower, 2–4 player bells, chess special moves, Renju fouls, domino blocking/scoring and memory timing passed.');

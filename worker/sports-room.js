import { DurableObject } from 'cloudflare:workers';

const allowed = new Set(['https://gamezone.sc.thegodlights.org','https://card-game-lounge.pages.dev','https://webtronics.run.place']);
export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (!allowed.has(request.headers.get('Origin'))) return new Response('Forbidden', {status:403});
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('WebSocket required',{status:426});
    if (!/^\/room\/[a-z-]{3,18}\/[a-f0-9]{32}$/.test(url.pathname)) return new Response('Invalid room',{status:400});
    const room = env.MATCHES.get(env.MATCHES.idFromName(url.pathname));
    return room.fetch(request);
  }
};
export class SportsMatch extends DurableObject {
  fetch(request) {
    const role = new URL(request.url).searchParams.get('role');
    const host = this.ctx.getWebSockets('host')[0];
    const guest = this.ctx.getWebSockets('guest')[0];
    if (!['host','guest'].includes(role) || (role==='host' && host) || (role==='guest' && (!host || guest))) {
      return new Response('Room unavailable',{status:409});
    }
    const [client,server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server,[role]);
    server.send(JSON.stringify({type:'ready',role}));
    if (role==='guest') for (const socket of [host,server]) socket.send('{"type":"start"}');
    return new Response(null,{status:101,webSocket:client});
  }
  webSocketMessage(socket,raw) {
    if(typeof raw!=='string'||raw.length>1500) return socket.close(1008,'Invalid message');
    let m;
    try {m=JSON.parse(raw)} catch {return socket.close(1008,'Invalid JSON')}
    const host=this.ctx.getTags(socket).includes('host');
    const mask=n=>Number.isInteger(n)&&n>=0&&n<32;
    const frame=f=>Array.isArray(f)&&f.length===6&&f.every(mask);
    const valid=host?(m?.type==='frames'&&Array.isArray(m.frames)&&m.frames.length<=8&&m.frames.every(frame))||m?.type==='restart':m?.type==='key'&&Number.isInteger(m.key)&&m.key>=0&&m.key<5&&typeof m.down==='boolean';
    if(!valid)return socket.close(1008,'Invalid input');
    for(const peer of this.ctx.getWebSockets(host?'guest':'host')) peer.send(raw);
  }
  webSocketClose(socket){for(const peer of this.ctx.getWebSockets())if(peer!==socket)peer.close(1000,'Partner left')}
  webSocketError(socket){this.webSocketClose(socket)}
}

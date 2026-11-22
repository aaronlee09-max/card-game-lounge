export const red='#f75d51', blue='#46aaff', ink='#f9f6dc';
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function painter(c){
  function rect(x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h)}
  function line(x,y,X,Y,color=ink,width=2){c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.strokeStyle=color;c.lineWidth=width;c.stroke()}
  function circle(x,y,r,color,stroke=false){c.beginPath();c.arc(x,y,r,0,2*Math.PI);if(stroke){c.strokeStyle=color;c.lineWidth=2;c.stroke()}else{c.fillStyle=color;c.fill()}}
  function text(x,y,s,color=ink,size=16){c.fillStyle=color;c.font='bold '+size+'px system-ui';c.fillText(s,x,y)}
  function athlete(x,y,i,pose=0){
    const color=i?blue:red;
    circle(x+3,y+4,11,'#13252a55');line(x-7,y+4,x-8-pose,y+9,'#283746',4);line(x+5,y+4,x+7+pose,y+9,'#283746',4);
    line(x-10,y-2,x+10,y-2,color,8);circle(x,y-5,7,'#eac29d');circle(x,y-8,5,'#443629');
  }
  return {rect,line,circle,text,athlete};
}

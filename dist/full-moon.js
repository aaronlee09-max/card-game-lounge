function fullMoonPassword() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone:'Asia/Seoul', year:'2-digit', month:'2-digit', day:'2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return values.year+values.month+values.day;
}

function requestFullMoonPassword() {
  return window.prompt('비밀번호 입력');
}

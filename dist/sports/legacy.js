const old = new URLSearchParams(location.search).get('sport');
if (old !== null && /^\d+$/.test(old)) {
  const link = document.querySelectorAll('nav a')[Number(old)];
  if (link) location.replace(link.href);
}

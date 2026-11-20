// Cache updates must not interrupt an active game. The next navigation loads fresh assets.
navigator.serviceWorker?.addEventListener('controllerchange',()=>document.dispatchEvent(new Event('offline-ready')));
const installButton = document.querySelector('#install-app');
const offlineStatus = document.querySelector('#offline-status');
let installPrompt;

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  if(installButton) installButton.hidden = false;
});
installButton?.addEventListener('click', async () => {
  const prompt = installPrompt;
  installPrompt = null;
  if(installButton) installButton.hidden = true;
  if (prompt) await prompt.prompt();
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  if(installButton) installButton.hidden = true;
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('./sw.js',document.baseURI),{updateViaCache:'none'})
    .then(registration => {
      registration.update().catch(()=>{});
      if (registration.active) return;
      const worker = registration.installing || registration.waiting;
      if (!worker) throw new Error('Offline worker unavailable');
      return new Promise((resolve,reject) => {
        const check = () => {
          if (worker.state === 'activated') { worker.removeEventListener('statechange',check); resolve(); }
          else if (worker.state === 'redundant') { worker.removeEventListener('statechange',check); reject(new Error('Offline installation failed')); }
        };
        worker.addEventListener('statechange',check);
        check();
      });
    })
    .then(() => { offlineStatus.textContent = '오프라인 준비 완료'; })
    .catch(() => { offlineStatus.textContent = '오프라인 준비에 실패했어요. 온라인 상태에서 다시 열어 주세요.'; });
}

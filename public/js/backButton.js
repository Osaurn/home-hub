// Adds a back arrow above the page content. It only ever leads to one of the four
// list pages: the one the visitor came from, otherwise the one in data-fallback.
(function () {
  const script = document.currentScript;
  const main = document.querySelector('main');
  if (!main) return;
  const lists = ['tasks.html', 'equipment.html', 'materials.html', 'history.html'];
  let target = script.dataset.fallback;
  try {
    const ref = new URL(document.referrer);
    const page = ref.pathname.split('/').pop();
    if (ref.origin === location.origin && lists.includes(page)) target = page;
  } catch (e) {}
  const btn = document.createElement('a');
  btn.className = 'back-btn';
  btn.href = target;
  btn.setAttribute('aria-label', 'Takaisin');
  btn.title = 'Takaisin';
  btn.textContent = '←';
  const row = document.createElement('div');
  row.className = 'back-row';
  row.appendChild(btn);
  main.parentNode.insertBefore(row, main);
})();

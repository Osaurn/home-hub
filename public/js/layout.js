// Builds the floating top bar (brand, section links, global search) into <header class="site">.
(function () {
  const header = document.querySelector('header.site');
  if (!header) return;

  const SECTIONS = [
    { href: 'tasks.html', label: 'Tehtävät', pages: ['tasks', 'task-form'] },
    { href: 'equipment.html', label: 'Laitteet', pages: ['equipment', 'equipment-detail', 'equipment-form'] },
    { href: 'materials.html', label: 'Materiaalit', pages: ['materials', 'material-detail', 'material-form'] },
    { href: 'history.html', label: 'Päiväkirja', pages: ['history'] },
  ];
  const page = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');

  header.innerHTML = `
    <a href="index.html" class="brand"><img class="brand-logo" src="img/logo.png" alt="" /><span class="brand-name">Kalle Kotiapuri</span></a>
    <nav>
      ${SECTIONS.map(
        (s) => `<a href="${s.href}"${s.pages.includes(page) ? ' class="active"' : ''}>${s.label}</a>`
      ).join('')}
    </nav>
    <div class="nav-tools">
      <button type="button" class="search-toggle" aria-label="Haku" aria-expanded="false">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      </button>
    </div>
    <div class="global-search" hidden>
      <input type="search" class="global-search-input" placeholder="Hae tehtävistä, laitteista, materiaaleista, päiväkirjasta…" aria-label="Haku" autocomplete="off" />
      <div class="global-search-results"></div>
    </div>`;

  const toggle = header.querySelector('.search-toggle');
  const panel = header.querySelector('.global-search');
  const input = header.querySelector('.global-search-input');
  const results = header.querySelector('.global-search-results');

  let index = null;
  async function loadIndex() {
    if (index) return index;
    const safe = (p) => p.catch(() => []);
    const [tasks, equipment, materials, history] = await Promise.all([
      safe(api.getTasks()),
      safe(api.getEquipmentList()),
      safe(api.getMaterials()),
      safe(api.request('GET', '/api/history')),
    ]);
    index = [
      ...tasks.map((t) => ({ type: 'Tehtävät', title: t.title, sub: t.equipment_name || '', href: `task-form.html?id=${t.id}`, text: [t.title, t.instructions, t.equipment_name, (t.tags || []).map((x) => x.name || x).join(' ')] })),
      ...equipment.map((e) => ({ type: 'Laitteet', title: e.name, sub: [e.location, e.brand].filter(Boolean).join(' · '), href: `equipment-detail.html?id=${e.id}`, text: [e.name, e.location, e.brand, e.model, e.notes] })),
      ...materials.map((m) => ({ type: 'Materiaalit', title: m.name, sub: [m.brand, m.product, m.color_name].filter(Boolean).join(' · '), href: `material-detail.html?id=${m.id}`, text: [m.name, m.brand, m.product, m.color_name, m.color_code, m.category, m.location, m.notes] })),
      ...history.map((h) => ({ type: 'Päiväkirja', title: h.task_title, sub: [h.completed_at, h.note].filter(Boolean).join(' · '), href: 'history.html', text: [h.task_title, h.equipment_name, h.note, h.completed_at] })),
    ].map((r) => ({ ...r, haystack: r.text.filter(Boolean).join(' ').toLowerCase() }));
    return index;
  }

  async function runSearch() {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.innerHTML = ''; return; }
    const data = await loadIndex();
    if (input.value.trim().toLowerCase() !== q) return;
    const hits = data.filter((r) => r.haystack.includes(q)).slice(0, 30);
    if (!hits.length) { results.innerHTML = '<p class="muted gs-empty">Ei tuloksia.</p>'; return; }
    let html = '';
    let last = '';
    for (const r of hits) {
      if (r.type !== last) { html += `<div class="gs-group">${r.type}</div>`; last = r.type; }
      html += `<a class="gs-item" href="${r.href}"><span>${escapeHtml(r.title || '')}</span>${r.sub ? `<small>${escapeHtml(r.sub)}</small>` : ''}</a>`;
    }
    results.innerHTML = html;
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) { input.focus(); loadIndex(); } else { input.value = ''; results.innerHTML = ''; }
  }

  toggle.addEventListener('click', () => setOpen(panel.hidden));
  input.addEventListener('input', runSearch);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) setOpen(false); });
  document.addEventListener('click', (e) => { if (!panel.hidden && !header.contains(e.target)) setOpen(false); });
})();

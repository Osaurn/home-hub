let lastDashboard = null;
let selectedQuarter = null;
let quarterPanelTagFilter = null;
let lastQuarterData = null;

function quarterOfMonth(m) {
  return Math.floor((m - 1) / 3) + 1;
}

function checkpointQuarter(checkpoint) {
  if (checkpoint.type === 'quarterly') return checkpoint.quarter;
  if (checkpoint.type === 'monthly') return quarterOfMonth(checkpoint.month);
  return null;
}

function computeQuarterStatus(dashboard) {
  const status = { 1: 'upcoming', 2: 'upcoming', 3: 'upcoming', 4: 'upcoming' };
  const cq = dashboard.currentQuarter;
  for (let q = 1; q <= 4; q++) {
    if (q <= cq) status[q] = 'done';
  }
  dashboard.overdueTasks.forEach((t) => {
    const q = checkpointQuarter(t.checkpoint);
    if (q) status[q] = 'overdue';
  });
  dashboard.dueTasks.forEach((t) => {
    const q = checkpointQuarter(t.checkpoint);
    if (q) status[q] = 'due';
  });
  return status;
}

function wireCompleteButtons(scope) {
  scope.querySelectorAll('.complete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await api.completeTask(btn.dataset.taskId, { completed_at: todayISO() });
        await loadDashboard();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
      }
    });
  });
}

function taskCardHtml(entry) {
  return `
    <div class="card status-${entry.checkpoint.status}" data-task-id="${entry.taskId}">
      <div class="card-header">
        <div>
          <div class="card-title"><a href="task-form.html?id=${entry.taskId}">${escapeHtml(entry.title)}</a></div>
          <div class="card-meta">${escapeHtml(formatCheckpoint(entry.checkpoint))}${entry.equipmentName ? ' · ' + escapeHtml(entry.equipmentName) : ''}</div>
          ${tagChipsHtml(entry.tags)}
        </div>
        <span class="badge status-${entry.checkpoint.status}">${STATUS_LABELS[entry.checkpoint.status]}</span>
      </div>
      <div class="form-actions">
        <button class="btn small complete-btn" data-task-id="${entry.taskId}">Merkitse tehdyksi</button>
        <a class="btn secondary small" href="task-form.html?id=${entry.taskId}">Näytä tiedot</a>
      </div>
    </div>`;
}

function uniqueTags(tasks) {
  const map = new Map();
  for (const t of tasks) {
    for (const tag of t.tags || []) map.set(tag.id, tag.name);
  }
  return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'fi'));
}

function renderTagFilterBar(container, tags, activeId, onSelect) {
  const allChip = `<button type="button" class="tag-chip filter-chip${activeId === null ? ' active' : ''}" data-tag-id="">Kaikki</button>`;
  const chips = tags
    .map(
      (t) =>
        `<button type="button" class="tag-chip filter-chip${activeId === t.id ? ' active' : ''}" data-tag-id="${t.id}">${escapeHtml(t.name)}</button>`
    )
    .join('');
  container.innerHTML = allChip + chips;
  container.querySelectorAll('.filter-chip').forEach((btn) => {
    btn.addEventListener('click', () => onSelect(btn.dataset.tagId ? Number(btn.dataset.tagId) : null));
  });
}

function renderTaskList(container, entries, emptyText) {
  if (entries.length === 0) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }
  container.innerHTML = entries.map(taskCardHtml).join('');
  wireCompleteButtons(container);
}

function renderClock(dashboard) {
  renderYearlyClock(document.getElementById('clock'), {
    today: new Date(dashboard.today),
    currentQuarter: dashboard.currentQuarter,
    quarterStatus: computeQuarterStatus(dashboard),
    selectedQuarter,
    onQuarterClick: handleQuarterClick,
  });
}

async function handleQuarterClick(q) {
  selectedQuarter = selectedQuarter === q ? null : q;
  quarterPanelTagFilter = null;
  if (lastDashboard) renderClock(lastDashboard);
  await renderQuarterPanel();
}

async function renderQuarterPanel() {
  const section = document.getElementById('quarter-panel-section');
  const panel = document.getElementById('quarter-panel');

  if (!selectedQuarter) {
    section.style.display = 'none';
    panel.innerHTML = '';
    lastQuarterData = null;
    return;
  }

  section.style.display = '';
  panel.innerHTML = '<p class="muted">Ladataan…</p>';

  lastQuarterData = await api.getQuarterTasks(selectedQuarter);
  renderQuarterPanelContent();
}

function renderQuarterPanelContent() {
  const panel = document.getElementById('quarter-panel');
  const data = lastQuarterData;
  const tags = uniqueTags(data.tasks);
  const filtered = quarterPanelTagFilter
    ? data.tasks.filter((t) => (t.tags || []).some((tag) => tag.id === quarterPanelTagFilter))
    : data.tasks;
  const listHtml =
    filtered.length === 0
      ? '<div class="empty-state">Ei tehtäviä tälle vuosineljännekselle.</div>'
      : filtered.map(taskCardHtml).join('');

  panel.innerHTML = `
    <div class="card-header" style="margin-bottom: 10px;">
      <h3 style="margin: 0;">${QUARTER_NAMES[selectedQuarter]} — ${escapeHtml(QUARTER_LABELS[selectedQuarter])} ${data.year}</h3>
      <button class="btn secondary small" id="close-quarter-panel">Sulje</button>
    </div>
    ${tags.length > 0 ? '<div class="tag-filter-bar" id="quarter-tag-filter"></div>' : ''}
    ${listHtml}`;

  document.getElementById('close-quarter-panel').addEventListener('click', () => handleQuarterClick(selectedQuarter));
  if (tags.length > 0) {
    renderTagFilterBar(document.getElementById('quarter-tag-filter'), tags, quarterPanelTagFilter, (id) => {
      quarterPanelTagFilter = id;
      renderQuarterPanelContent();
    });
  }
  wireCompleteButtons(panel);
}

let kalleMood = null;
let kalleMessage = '';

function renderKalle(dashboard) {
  const el = document.getElementById('kalle');
  const mood = KalleMood.computeKalleMood(dashboard.overdueTasks.length, dashboard.dueTasks.length);
  if (mood !== kalleMood) {
    kalleMood = mood;
    kalleMessage = KalleMood.pickMessage(mood);
    el.className = `kalle kalle-${mood}`;
    el.innerHTML = `
      <div class="kalle-bubble"></div>
      <img class="kalle-img" src="img/kalle/${mood}.png" alt="${KalleMood.ALT[mood]}" />`;
    el.querySelector('.kalle-img').addEventListener('error', () => { el.hidden = true; });
    el.querySelector('.kalle-bubble').textContent = kalleMessage;
  }
  el.hidden = false;
}

async function loadDashboard() {
  const dashboard = await api.getDashboard();
  lastDashboard = dashboard;

  renderKalle(dashboard);
  renderClock(dashboard);
  renderTaskList(document.getElementById('overdue-list'), dashboard.overdueTasks, 'Ei myöhässä olevia tehtäviä.');
  renderTaskList(document.getElementById('due-list'), dashboard.dueTasks, 'Ei tällä hetkellä ajankohtaisia tehtäviä.');
  document.getElementById('overdue-section').style.display = dashboard.overdueTasks.length > 0 ? '' : 'none';

  const recent = await api.getHistory(5);
  const recentContainer = document.getElementById('recent-history-list');
  recentContainer.innerHTML =
    recent.length === 0
      ? '<div class="empty-state">Ei vielä tehtyjä tehtäviä.</div>'
      : recent.map(historyEntryHtml).join('');

  if (selectedQuarter) await renderQuarterPanel();
}

loadDashboard().catch((err) => {
  console.error(err);
  document.getElementById('due-list').innerHTML = `<div class="empty-state">Virhe ladattaessa: ${escapeHtml(err.message)}</div>`;
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') loadDashboard().catch(console.error);
});

setInterval(() => {
  loadDashboard().catch(console.error);
}, 60000);

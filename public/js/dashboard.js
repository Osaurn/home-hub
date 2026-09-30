let lastDashboard = null;
let selectedQuarter = null;

function computeQuarterStatus(dashboard) {
  const status = { 1: 'upcoming', 2: 'upcoming', 3: 'upcoming', 4: 'upcoming' };
  const cq = dashboard.currentQuarter;
  for (let q = 1; q <= 4; q++) {
    if (q <= cq) status[q] = 'done';
  }
  dashboard.overdueTasks
    .filter((t) => t.checkpoint.type === 'quarterly')
    .forEach((t) => { status[t.checkpoint.quarter] = 'overdue'; });
  dashboard.dueTasks
    .filter((t) => t.checkpoint.type === 'quarterly')
    .forEach((t) => { status[t.checkpoint.quarter] = 'due'; });
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
          <div class="card-meta">${escapeHtml(formatCheckpoint(entry.checkpoint))}</div>
        </div>
        <span class="badge status-${entry.checkpoint.status}">${STATUS_LABELS[entry.checkpoint.status]}</span>
      </div>
      <div class="form-actions">
        <button class="btn small complete-btn" data-task-id="${entry.taskId}">Merkitse tehdyksi</button>
        <a class="btn secondary small" href="task-form.html?id=${entry.taskId}">Näytä tiedot</a>
      </div>
    </div>`;
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
  if (lastDashboard) renderClock(lastDashboard);
  await renderQuarterPanel();
}

async function renderQuarterPanel() {
  const section = document.getElementById('quarter-panel-section');
  const panel = document.getElementById('quarter-panel');

  if (!selectedQuarter) {
    section.style.display = 'none';
    panel.innerHTML = '';
    return;
  }

  section.style.display = '';
  panel.innerHTML = '<p class="muted">Ladataan…</p>';

  const data = await api.getQuarterTasks(selectedQuarter);
  const listHtml =
    data.tasks.length === 0
      ? '<div class="empty-state">Ei tehtäviä tälle vuosineljännekselle.</div>'
      : data.tasks.map(taskCardHtml).join('');

  panel.innerHTML = `
    <div class="card-header" style="margin-bottom: 10px;">
      <h3 style="margin: 0;">${QUARTER_NAMES[selectedQuarter]} — ${escapeHtml(QUARTER_LABELS[selectedQuarter])} ${data.year}</h3>
      <button class="btn secondary small" id="close-quarter-panel">Sulje</button>
    </div>
    ${listHtml}`;

  document.getElementById('close-quarter-panel').addEventListener('click', () => handleQuarterClick(selectedQuarter));
  wireCompleteButtons(panel);
}

async function loadDashboard() {
  const dashboard = await api.getDashboard();
  lastDashboard = dashboard;

  renderClock(dashboard);
  renderTaskList(document.getElementById('overdue-list'), dashboard.overdueTasks, 'Ei myöhässä olevia tehtäviä.');
  renderTaskList(document.getElementById('due-list'), dashboard.dueTasks, 'Ei tällä hetkellä ajankohtaisia tehtäviä.');
  document.getElementById('overdue-section').style.display = dashboard.overdueTasks.length > 0 ? '' : 'none';

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

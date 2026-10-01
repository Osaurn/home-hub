let allEntries = [];

function renderHistory() {
  const container = document.getElementById('history-list');
  const q = document.getElementById('history-search').value.trim().toLowerCase();

  if (allEntries.length === 0) {
    container.innerHTML = '<div class="empty-state">Ei vielä tehtyjä tehtäviä.</div>';
    return;
  }

  const entries = q
    ? allEntries.filter((e) =>
        [e.task_title, e.equipment_name, e.note, e.completed_at].join(' ').toLowerCase().includes(q))
    : allEntries;

  container.innerHTML = entries.length
    ? entries.map(historyEntryHtml).join('')
    : '<div class="empty-state">Ei hakua vastaavia merkintöjä.</div>';
}

async function loadHistory() {
  allEntries = await api.getHistory();
  renderHistory();
}

document.getElementById('history-search').addEventListener('input', renderHistory);

loadHistory().catch((err) => {
  document.getElementById('history-list').innerHTML = `<div class="empty-state">Virhe ladattaessa: ${escapeHtml(err.message)}</div>`;
});

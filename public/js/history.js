async function loadHistory() {
  const entries = await api.getHistory();
  const container = document.getElementById('history-list');

  if (entries.length === 0) {
    container.innerHTML = '<div class="empty-state">Ei vielä tehtyjä tehtäviä.</div>';
    return;
  }

  container.innerHTML = entries.map(historyEntryHtml).join('');
}

loadHistory().catch((err) => {
  document.getElementById('history-list').innerHTML = `<div class="empty-state">Virhe ladattaessa: ${escapeHtml(err.message)}</div>`;
});

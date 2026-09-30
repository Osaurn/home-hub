let allTasks = [];
let allTags = [];
let activeTagFilter = null;

function taskListCardHtml(task) {
  return `
    <div class="card">
      <div class="task-row">
        <div>
          <div class="card-title"><a href="task-form.html?id=${task.id}">${escapeHtml(task.title)}</a></div>
          <div class="task-row-meta">${escapeHtml(formatRecurrence(task))}</div>
          ${tagChipsHtml(task.tags)}
        </div>
        <a class="btn secondary small" href="task-form.html?id=${task.id}">Muokkaa</a>
      </div>
    </div>`;
}

function renderTaskList() {
  const container = document.getElementById('task-list');

  if (allTasks.length === 0) {
    container.innerHTML =
      '<div class="empty-state">Ei vielä yhtään tehtävää. Lisää ensimmäinen tehtävä yllä olevasta painikkeesta.</div>';
    return;
  }

  const filtered = activeTagFilter
    ? allTasks.filter((t) => (t.tags || []).some((tag) => tag.id === activeTagFilter))
    : allTasks;

  container.innerHTML =
    filtered.length === 0
      ? '<div class="empty-state">Ei tehtäviä tällä tunnisteella.</div>'
      : filtered.map(taskListCardHtml).join('');
}

function renderFilterBar() {
  const bar = document.getElementById('tag-filter-bar');
  const hint = document.getElementById('tag-filter-hint');
  if (allTags.length === 0) {
    bar.innerHTML = '';
    if (hint) hint.style.display = 'none';
    return;
  }
  if (hint) hint.style.display = '';

  const allChip = `<button type="button" class="tag-chip filter-chip${activeTagFilter === null ? ' active' : ''}" data-tag-id="">Kaikki</button>`;
  const chips = allTags
    .map(
      (t) => `
      <span class="tag-chip filter-chip-wrap${activeTagFilter === t.id ? ' active' : ''}">
        <button type="button" class="filter-chip-btn" data-tag-id="${t.id}">${escapeHtml(t.name)}</button>
        <button type="button" class="tag-chip-remove" data-remove-tag-id="${t.id}" aria-label="Poista tunniste ${escapeHtml(t.name)}">×</button>
      </span>`
    )
    .join('');
  bar.innerHTML = allChip + chips;

  bar.querySelectorAll('[data-tag-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTagFilter = btn.dataset.tagId ? Number(btn.dataset.tagId) : null;
      renderFilterBar();
      renderTaskList();
    });
  });

  bar.querySelectorAll('[data-remove-tag-id]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.removeTagId);
      const tag = allTags.find((t) => t.id === id);
      const usageCount = allTasks.filter((t) => (t.tags || []).some((tg) => tg.id === id)).length;

      const message =
        usageCount === 0
          ? `Poistetaanko tunniste "${tag.name}"? Sitä ei ole tällä hetkellä liitetty yhteenkään tehtävään.`
          : usageCount === 1
            ? `Poistetaanko tunniste "${tag.name}"? Se on käytössä 1 tehtävässä ja poistuu siltä.`
            : `Poistetaanko tunniste "${tag.name}"? Se on käytössä ${usageCount} tehtävässä ja poistuu niiltä kaikilta.`;

      if (!confirm(message)) return;
      await api.deleteTag(id);
      if (activeTagFilter === id) activeTagFilter = null;
      await loadTasks();
    });
  });
}

async function loadTasks() {
  [allTasks, allTags] = await Promise.all([api.getTasks(), api.getTags()]);
  renderFilterBar();
  renderTaskList();
}

loadTasks().catch((err) => {
  document.getElementById('task-list').innerHTML = `<div class="empty-state">Virhe ladattaessa: ${escapeHtml(err.message)}</div>`;
});

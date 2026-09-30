async function loadTasks() {
  const tasks = await api.getTasks();
  const container = document.getElementById('task-list');

  if (tasks.length === 0) {
    container.innerHTML = '<div class="empty-state">Ei vielä yhtään tehtävää. Lisää ensimmäinen tehtävä yllä olevasta painikkeesta.</div>';
    return;
  }

  container.innerHTML = tasks
    .map(
      (task) => `
      <div class="card">
        <div class="task-row">
          <div>
            <div class="card-title"><a href="task-form.html?id=${task.id}">${escapeHtml(task.title)}</a></div>
            <div class="task-row-meta">${escapeHtml(formatRecurrence(task))}</div>
          </div>
          <a class="btn secondary small" href="task-form.html?id=${task.id}">Muokkaa</a>
        </div>
      </div>`
    )
    .join('');
}

loadTasks().catch((err) => {
  document.getElementById('task-list').innerHTML = `<div class="empty-state">Virhe ladattaessa: ${escapeHtml(err.message)}</div>`;
});

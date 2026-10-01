const equipmentId = new URLSearchParams(window.location.search).get('id');

function factsHtml(e) {
  const rows = [
    ['Tyyppi', e.category],
    ['Sijainti', e.location],
    ['Merkki ja malli', e.model],
    ['Sarjanumero', e.serial_number],
    ['Hankintapäivä', e.purchase_date],
    ['Takuu', warrantyText(e)],
    ['Takuun tiedot', e.warranty_notes],
  ].filter(([, v]) => v);
  if (rows.length === 0) return '';
  return `<dl class="equipment-facts">${rows
    .map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}${k === 'Takuu' ? ' ' + warrantyBadgeHtml(e.warranty) : ''}</dd>`)
    .join('')}</dl>`;
}

function taskRowHtml(t) {
  const worst = ['overdue', 'due', 'upcoming', 'done'].find((s) => t.checkpoints.some((c) => c.status === s));
  return `
    <li>
      <span><a href="task-form.html?id=${t.id}">${escapeHtml(t.title)}</a>
        <span class="muted"> · ${escapeHtml(formatRecurrence(t))}</span></span>
      ${worst ? `<span class="badge status-${worst}">${STATUS_LABELS[worst]}</span>` : ''}
    </li>`;
}

function render(e) {
  document.title = `${e.name} — Kalle Kotiapuri`;
  const tasks =
    e.tasks.length === 0
      ? '<li class="muted">Ei liitettyjä tehtäviä.</li>'
      : e.tasks.map(taskRowHtml).join('');
  const history =
    e.history.length === 0
      ? '<li class="muted">Ei vielä huoltohistoriaa.</li>'
      : e.history
          .map(
            (h) => `
        <li>
          <span>${h.completed_at} — <a href="task-form.html?id=${h.task_id}">${escapeHtml(h.task_title)}</a>${h.note ? ' — ' + escapeHtml(h.note) : ''}</span>
        </li>`
          )
          .join('');

  document.getElementById('detail').innerHTML = `
    <div class="card-header">
      <h2 style="margin:0;">${escapeHtml(e.name)}</h2>
      <a class="btn secondary small" href="equipment-form.html?id=${e.id}">Muokkaa</a>
    </div>
    ${factsHtml(e)}

    <h2 class="section-title">Käyttöohjeet</h2>
    <div class="card" id="manuals"></div>

    <h2 class="section-title">Pikaohjeet</h2>
    <div class="card instructions-preview">${e.instructions ? marked.parse(e.instructions) : '<p class="muted">Ei pikaohjeita. Lisää ne muokkaussivulta.</p>'}</div>

    <h2 class="section-title">Tehtävät</h2>
    <div class="card">
      <ul class="completion-list" style="margin:0;">${tasks}</ul>
      <div class="form-actions"><a class="btn small" href="task-form.html?equipment_id=${e.id}">+ Lisää tehtävä</a></div>
    </div>

    <h2 class="section-title">Huoltohistoria</h2>
    <div class="card"><ul class="completion-list" style="margin:0;">${history}</ul></div>

    ${e.notes ? `<h2 class="section-title">Muistiinpanot</h2><div class="card" style="white-space:pre-wrap;">${escapeHtml(e.notes)}</div>` : ''}
  `;
  renderManualViewer(document.getElementById('manuals'), e.manuals);
}

if (!equipmentId) {
  window.location.href = 'equipment.html';
} else {
  api.getEquipment(equipmentId).then(render).catch((err) => {
    document.getElementById('detail').innerHTML = `<div class="empty-state">Virhe ladattaessa: ${escapeHtml(err.message)}</div>`;
  });
}

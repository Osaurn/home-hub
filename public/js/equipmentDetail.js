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

const PREVIEW_KEY = 'manualPreviewOpen';

function isPreviewable(m) {
  return m.mime_type === 'application/pdf' || /^image\/(png|jpeg|gif|webp)$/.test(m.mime_type || '');
}

function previewOpen() {
  try {
    return localStorage.getItem(PREVIEW_KEY) !== '0';
  } catch {
    return true;
  }
}

function viewerHtml(m) {
  const url = `/api/manuals/${m.id}`;
  const frame =
    m.mime_type === 'application/pdf'
      ? `<iframe class="manual-frame" src="${url}#view=FitH" title="${escapeHtml(m.filename)}"></iframe>`
      : `<img class="manual-image" src="${url}" alt="${escapeHtml(m.filename)}" />`;
  return `${frame}
    <div class="manual-links">
      <a href="${url}" target="_blank">Avaa uuteen ikkunaan</a>
      <a href="${url}" download="${escapeHtml(m.filename)}">Lataa</a>
    </div>`;
}

function renderManuals(manuals) {
  const container = document.getElementById('manuals');
  if (manuals.length === 0) {
    container.innerHTML = '<p class="muted">Ei käyttöohjeita. Lisää niitä muokkaussivulta.</p>';
    return;
  }
  const previewable = manuals.filter(isPreviewable);
  const others = manuals.filter((m) => !isPreviewable(m));
  let selected = previewable[0] || null;

  function draw() {
    const open = previewOpen();
    const chips =
      previewable.length > 1
        ? `<div class="tag-chips">${previewable
            .map(
              (m) =>
                `<button type="button" class="tag-chip toggle-chip${m === selected ? ' active' : ''}" data-manual-id="${m.id}">${escapeHtml(m.filename)}</button>`
            )
            .join('')}</div>`
        : selected
          ? `<div class="card-meta">${escapeHtml(selected.filename)}</div>`
          : '';
    const toggle = selected
      ? `<button type="button" class="btn secondary small" id="preview-toggle">${open ? 'Piilota esikatselu' : 'Näytä esikatselu'}</button>`
      : '';
    const otherLinks = others.length
      ? `<ul class="attachment-list">${others
          .map((m) => `<li><a href="/api/manuals/${m.id}" target="_blank">${escapeHtml(m.filename)}</a></li>`)
          .join('')}</ul>`
      : '';
    container.innerHTML = `
      ${selected ? `<div class="field-header">${chips}${toggle}</div>` : ''}
      ${selected && open ? `<div class="manual-viewer">${viewerHtml(selected)}</div>` : ''}
      ${otherLinks}`;

    container.querySelectorAll('[data-manual-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selected = previewable.find((m) => m.id === Number(btn.dataset.manualId));
        draw();
      });
    });
    const t = document.getElementById('preview-toggle');
    if (t) {
      t.addEventListener('click', () => {
        try {
          localStorage.setItem(PREVIEW_KEY, open ? '0' : '1');
        } catch {}
        draw();
      });
    }
  }
  draw();
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
  renderManuals(e.manuals);
}

if (!equipmentId) {
  window.location.href = 'equipment.html';
} else {
  api.getEquipment(equipmentId).then(render).catch((err) => {
    document.getElementById('detail').innerHTML = `<div class="empty-state">Virhe ladattaessa: ${escapeHtml(err.message)}</div>`;
  });
}

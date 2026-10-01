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
      : e.history.map(historyRowHtml).join('');

  document.getElementById('detail').innerHTML = `
    <div class="card-header">
      <h2 style="margin:0;"><span aria-hidden="true">${EquipmentIcons.equipmentIcon(e)}</span> ${escapeHtml(e.name)}</h2>
      <a class="btn secondary small" href="equipment-form.html?id=${e.id}">Muokkaa</a>
    </div>
    ${factsHtml(e)}

    <h2 class="section-title">Käyttöohjeet</h2>
    <div class="card" id="manuals"></div>

    <h2 class="section-title">Ohjeet ja muistiinpanot</h2>
    <div class="card instructions-preview">${e.instructions ? marked.parse(e.instructions) : '<p class="muted">Ei vielä ohjeita tai muistiinpanoja. Lisää ne muokkaussivulta.</p>'}</div>

    <h2 class="section-title">Tehtävät</h2>
    <div class="card">
      <ul class="completion-list" style="margin:0;">${tasks}</ul>
      <div class="form-actions"><a class="btn small" href="task-form.html?equipment_id=${e.id}">+ Lisää tehtävä</a></div>
    </div>

    <h2 class="section-title">Huoltohistoria</h2>
    <div class="card">
      <ul class="completion-list" style="margin:0;" id="history-list">${history}</ul>
      <div id="event-form-area">
        <div class="form-actions"><button type="button" class="btn secondary small" id="add-event-btn">+ Lisää merkintä</button></div>
      </div>
    </div>
  `;
  renderManualViewer(document.getElementById('manuals'), e.manuals);
  wireHistory(e);
}

function historyRowHtml(h) {
  if (h.kind === 'task') {
    return `
      <li>
        <span>${h.date} — <a href="task-form.html?id=${h.task_id}">${escapeHtml(h.title)}</a>${h.note ? ' — ' + escapeHtml(h.note) : ''}</span>
        <span class="badge status-done">Tehtävä</span>
      </li>`;
  }
  const meta = [h.performed_by ? `Tekijä: ${escapeHtml(h.performed_by)}` : null, h.note ? escapeHtml(h.note) : null]
    .filter(Boolean)
    .join(' — ');
  return `
    <li>
      <span>${h.date} — <strong>${escapeHtml(h.title)}</strong>${meta ? ' — ' + meta : ''}</span>
      <span>
        <button type="button" class="btn secondary small" data-edit-event="${h.id}">Muokkaa</button>
        <button type="button" class="btn danger small" data-delete-event="${h.id}">Poista</button>
      </span>
    </li>`;
}

function eventFormHtml(ev) {
  return `
    <form class="task-form event-form" id="event-form">
      <label for="event-title">Mitä tehtiin</label>
      <input type="text" id="event-title" required maxlength="200" placeholder="esim. Huoltomies vaihtoi puhaltimen" value="${escapeHtml(ev ? ev.title : '')}" />
      <label for="event-date">Päivämäärä</label>
      <input type="date" id="event-date" required value="${ev ? ev.date : todayISO()}" />
      <label for="event-by">Tekijä (valinnainen)</label>
      <input type="text" id="event-by" placeholder="esim. Huolto Oy / Matti" value="${escapeHtml(ev ? ev.performed_by || '' : '')}" />
      <label for="event-note">Lisätiedot (valinnainen)</label>
      <textarea id="event-note" style="min-height:70px;">${escapeHtml(ev ? ev.note || '' : '')}</textarea>
      <div class="form-actions">
        <button type="submit" class="btn small">Tallenna</button>
        <button type="button" class="btn secondary small" id="event-cancel">Peruuta</button>
      </div>
    </form>`;
}

function wireHistory(e) {
  const area = document.getElementById('event-form-area');
  const reload = () => api.getEquipment(equipmentId).then(render);

  function openForm(ev) {
    area.innerHTML = eventFormHtml(ev);
    document.getElementById('event-title').focus();
    document.getElementById('event-cancel').addEventListener('click', reload);
    document.getElementById('event-form').addEventListener('submit', async (submitEvent) => {
      submitEvent.preventDefault();
      const data = {
        title: document.getElementById('event-title').value,
        event_date: document.getElementById('event-date').value,
        performed_by: document.getElementById('event-by').value,
        note: document.getElementById('event-note').value,
      };
      try {
        if (ev) await api.updateEquipmentEvent(ev.id, data);
        else await api.addEquipmentEvent(equipmentId, data);
        await reload();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  document.getElementById('add-event-btn').addEventListener('click', () => openForm(null));
  document.querySelectorAll('[data-edit-event]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openForm(e.history.find((h) => h.kind === 'event' && h.id === Number(btn.dataset.editEvent)));
    });
  });
  document.querySelectorAll('[data-delete-event]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Poistetaanko tämä merkintä huoltohistoriasta?')) return;
      try {
        await api.deleteEquipmentEvent(btn.dataset.deleteEvent);
        await reload();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

if (!equipmentId) {
  window.location.href = 'equipment.html';
} else {
  api.getEquipment(equipmentId).then(render).catch((err) => {
    document.getElementById('detail').innerHTML = `<div class="empty-state">Virhe ladattaessa: ${escapeHtml(err.message)}</div>`;
  });
}

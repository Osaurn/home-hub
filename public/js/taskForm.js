const params = new URLSearchParams(window.location.search);
const taskId = params.get('id');
const isEditing = Boolean(taskId);

const form = document.getElementById('task-form');
const instructionsInput = document.getElementById('instructions');
const previewEl = document.getElementById('instructions-preview');
const toggleQuarterly = document.getElementById('toggle-quarterly');
const toggleMonthly = document.getElementById('toggle-monthly');
const toggleInterval = document.getElementById('toggle-interval');
const quarterlyFields = document.getElementById('quarterly-fields');
const monthlyFields = document.getElementById('monthly-fields');
const intervalFields = document.getElementById('interval-fields');
const deleteBtn = document.getElementById('delete-btn');
const detailSections = document.getElementById('detail-sections');

let recurrenceType = 'quarterly';
let pendingFiles = [];
let allTags = [];
let selectedTagIds = new Set();
let instructionsMode = 'edit';
let allEquipment = [];

const instructionsToggle = document.getElementById('instructions-toggle');

function setRecurrenceType(type) {
  recurrenceType = type;
  toggleQuarterly.classList.toggle('active', type === 'quarterly');
  toggleMonthly.classList.toggle('active', type === 'monthly');
  toggleInterval.classList.toggle('active', type === 'interval');
  quarterlyFields.style.display = type === 'quarterly' ? '' : 'none';
  monthlyFields.style.display = type === 'monthly' ? '' : 'none';
  intervalFields.style.display = type === 'interval' ? '' : 'none';
}

toggleQuarterly.addEventListener('click', () => setRecurrenceType('quarterly'));
toggleMonthly.addEventListener('click', () => setRecurrenceType('monthly'));
toggleInterval.addEventListener('click', () => setRecurrenceType('interval'));

function setInstructionsMode(mode) {
  instructionsMode = mode;
  if (mode === 'preview') {
    instructionsInput.style.display = 'none';
    previewEl.style.display = '';
    previewEl.innerHTML = instructionsInput.value
      ? marked.parse(instructionsInput.value)
      : '<p class="muted">Ei ohjeita.</p>';
    instructionsToggle.textContent = 'Muokkaa';
  } else {
    instructionsInput.style.display = '';
    previewEl.style.display = 'none';
    instructionsToggle.textContent = 'Esikatselu';
  }
}

instructionsToggle.addEventListener('click', () => {
  setInstructionsMode(instructionsMode === 'edit' ? 'preview' : 'edit');
});

function fillForm(task) {
  document.getElementById('equipment_id').value = task.equipment_id || '';
  document.getElementById('title').value = task.title;
  instructionsInput.value = task.instructions || '';
  setInstructionsMode(task.instructions ? 'preview' : 'edit');
  setRecurrenceType(task.recurrence_type);

  if (task.recurrence_type === 'quarterly') {
    document.querySelectorAll('input[name="quarter"]').forEach((cb) => {
      cb.checked = task.quarters.includes(Number(cb.value));
    });
  } else if (task.recurrence_type === 'monthly') {
    document.querySelectorAll('input[name="month"]').forEach((cb) => {
      cb.checked = task.months.includes(Number(cb.value));
    });
  } else {
    document.getElementById('interval_min_years').value = task.interval_min_years;
    document.getElementById('interval_max_years').value = task.interval_max_years;
    document.getElementById('interval_first_due').value = task.interval_first_due || '';
  }
}

function renderAttachments(attachments) {
  const list = document.getElementById('attachment-list');
  const hint = document.getElementById('attachment-hint');
  if (hint) hint.style.display = 'none';
  if (attachments.length === 0) {
    list.innerHTML = '<li class="muted">Ei liitteitä.</li>';
    return;
  }
  list.innerHTML = attachments
    .map(
      (a) => `
      <li>
        <a href="/api/attachments/${a.id}" target="_blank">${escapeHtml(a.filename)}</a>
        <button class="btn danger small" data-att-id="${a.id}">Poista</button>
      </li>`
    )
    .join('');
  list.querySelectorAll('button[data-att-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api.deleteAttachment(btn.dataset.attId);
      refreshTask();
    });
  });
}

function renderTagChips() {
  const container = document.getElementById('tag-chips');
  if (allTags.length === 0) {
    container.innerHTML = '<p class="muted">Ei vielä tunnisteita. Lisää uusi alta.</p>';
    return;
  }
  container.innerHTML = allTags
    .map(
      (t) =>
        `<button type="button" class="tag-chip toggle-chip${selectedTagIds.has(t.id) ? ' active' : ''}" data-tag-id="${t.id}">${escapeHtml(t.name)}</button>`
    )
    .join('');
  container.querySelectorAll('.toggle-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.tagId);
      if (selectedTagIds.has(id)) selectedTagIds.delete(id);
      else selectedTagIds.add(id);
      renderTagChips();
    });
  });
}

document.getElementById('new-tag-btn').addEventListener('click', async () => {
  const input = document.getElementById('new-tag-input');
  const name = input.value.trim();
  if (!name) return;
  try {
    const tag = await api.createTag(name);
    if (!allTags.some((t) => t.id === tag.id)) {
      allTags.push(tag);
      allTags.sort((a, b) => a.name.localeCompare(b.name, 'fi'));
    }
    selectedTagIds.add(tag.id);
    input.value = '';
    renderTagChips();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('new-tag-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('new-tag-btn').click();
  }
});

function renderPendingFiles() {
  const list = document.getElementById('attachment-list');
  const hint = document.getElementById('attachment-hint');
  if (pendingFiles.length === 0) {
    list.innerHTML = '';
    if (hint) hint.style.display = '';
    return;
  }
  if (hint) hint.style.display = 'none';
  list.innerHTML = pendingFiles
    .map(
      (f, i) => `
      <li>
        <span>${escapeHtml(f.name)}</span>
        <button type="button" class="btn secondary small" data-pending-index="${i}">Poista</button>
      </li>`
    )
    .join('');
  list.querySelectorAll('button[data-pending-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pendingFiles.splice(Number(btn.dataset.pendingIndex), 1);
      renderPendingFiles();
    });
  });
}

function renderCompletions(completions) {
  const list = document.getElementById('completion-list');
  if (completions.length === 0) {
    list.innerHTML = '<li class="muted">Ei vielä merkintöjä.</li>';
    return;
  }
  list.innerHTML = completions
    .map(
      (c) => `
      <li>
        <span>${c.completed_at}${c.note ? ' — ' + escapeHtml(c.note) : ''}</span>
        <button class="btn secondary small" data-completion-id="${c.id}">Kumoa</button>
      </li>`
    )
    .join('');
  list.querySelectorAll('button[data-completion-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Kumotaanko tämä merkintä?')) return;
      await api.deleteCompletion(btn.dataset.completionId);
      refreshTask();
    });
  });
}

async function refreshTask() {
  const task = await api.getTask(taskId);
  fillForm(task);
  renderAttachments(task.attachments);
  renderCompletions(task.completions);
  selectedTagIds = new Set((task.tags || []).map((t) => t.id));
  renderTagChips();
}

let guideRequest = 0;

async function loadEquipmentGuide() {
  const panel = document.getElementById('equipment-guide');
  const id = document.getElementById('equipment_id').value;
  const request = ++guideRequest;
  if (!id) {
    panel.style.display = 'none';
    panel.innerHTML = '';
    return;
  }
  let e;
  try {
    e = await api.getEquipment(id);
  } catch (err) {
    return;
  }
  if (request !== guideRequest) return; // selection changed while loading

  const hasContent = e.manuals.length > 0 || e.instructions || e.notes;
  panel.innerHTML = `
    <div class="field-header">
      <strong>Laitteen ohjeet: ${escapeHtml(e.name)}</strong>
      <a class="btn secondary small" href="equipment-detail.html?id=${e.id}">Avaa laitteen sivu</a>
    </div>
    ${hasContent ? '' : `<p class="muted">Laitteelle ei ole vielä ohjeita. <a href="equipment-form.html?id=${e.id}">Lisää ohjeita</a></p>`}
    <div id="equipment-manuals"></div>
    ${e.instructions ? `<h3 class="guide-heading">Pikaohjeet</h3><div class="instructions-preview">${marked.parse(e.instructions)}</div>` : ''}
    ${e.notes ? `<h3 class="guide-heading">Muistiinpanot</h3><div style="white-space:pre-wrap;">${escapeHtml(e.notes)}</div>` : ''}`;
  if (e.manuals.length > 0) renderManualViewer(document.getElementById('equipment-manuals'), e.manuals, { collapsedByDefault: true });
  panel.style.display = '';
}

document.getElementById('equipment_id').addEventListener('change', loadEquipmentGuide);

function renderEquipmentOptions() {
  const select = document.getElementById('equipment_id');
  select.innerHTML =
    '<option value="">— Ei laitetta —</option>' +
    allEquipment.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
}

async function init() {
  [allTags, allEquipment] = await Promise.all([api.getTags(), api.getEquipmentList()]);
  renderEquipmentOptions();
  if (isEditing) {
    document.getElementById('page-title').textContent = 'Muokkaa tehtävää';
    deleteBtn.style.display = '';
    detailSections.style.display = '';
    document.getElementById('complete-date').value = todayISO();
    await refreshTask();
    loadEquipmentGuide();
  } else {
    setRecurrenceType('quarterly');
    setInstructionsMode('edit');
    const presetEquipment = params.get('equipment_id');
    if (presetEquipment) {
      document.getElementById('equipment_id').value = presetEquipment;
      loadEquipmentGuide();
    }
    renderPendingFiles();
    renderTagChips();
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    title: document.getElementById('title').value,
    instructions: instructionsInput.value,
    recurrence_type: recurrenceType,
    tag_ids: Array.from(selectedTagIds),
    equipment_id: document.getElementById('equipment_id').value || null,
  };
  if (recurrenceType === 'quarterly') {
    data.quarters = Array.from(document.querySelectorAll('input[name="quarter"]:checked')).map((cb) => Number(cb.value));
  } else if (recurrenceType === 'monthly') {
    data.months = Array.from(document.querySelectorAll('input[name="month"]:checked')).map((cb) => Number(cb.value));
  } else {
    data.interval_min_years = Number(document.getElementById('interval_min_years').value);
    data.interval_max_years = Number(document.getElementById('interval_max_years').value);
    data.interval_first_due = document.getElementById('interval_first_due').value || null;
  }

  try {
    if (isEditing) {
      await api.updateTask(taskId, data);
      window.location.href = `task-form.html?id=${taskId}`;
    } else {
      const created = await api.createTask(data);
      if (pendingFiles.length > 0) {
        try {
          await api.uploadAttachments(created.id, pendingFiles);
        } catch (err) {
          alert(`Tehtävä tallennettiin, mutta liitteiden lataus epäonnistui: ${err.message}`);
        }
      }
      window.location.href = `task-form.html?id=${created.id}`;
    }
  } catch (err) {
    alert(err.message);
  }
});

deleteBtn.addEventListener('click', async () => {
  if (!confirm('Poistetaanko tehtävä pysyvästi? Myös historia ja liitteet poistuvat.')) return;
  await api.deleteTask(taskId);
  window.location.href = 'tasks.html';
});

document.getElementById('complete-btn').addEventListener('click', async () => {
  const completedAt = document.getElementById('complete-date').value || todayISO();
  const note = document.getElementById('complete-note').value;
  try {
    await api.completeTask(taskId, { completed_at: completedAt, note });
    document.getElementById('complete-note').value = '';
    refreshTask();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('attachment-input').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;
  e.target.value = '';

  if (isEditing) {
    try {
      await api.uploadAttachments(taskId, files);
      refreshTask();
    } catch (err) {
      alert(err.message);
    }
  } else {
    pendingFiles = pendingFiles.concat(files);
    renderPendingFiles();
  }
});

init().catch((err) => alert(err.message));

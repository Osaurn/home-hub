const params = new URLSearchParams(window.location.search);
const taskId = params.get('id');
const isEditing = Boolean(taskId);

const form = document.getElementById('task-form');
const instructionsInput = document.getElementById('instructions');
const previewEl = document.getElementById('instructions-preview');
const toggleQuarterly = document.getElementById('toggle-quarterly');
const toggleInterval = document.getElementById('toggle-interval');
const quarterlyFields = document.getElementById('quarterly-fields');
const intervalFields = document.getElementById('interval-fields');
const deleteBtn = document.getElementById('delete-btn');
const detailSections = document.getElementById('detail-sections');

let recurrenceType = 'quarterly';
let pendingFiles = [];

function setRecurrenceType(type) {
  recurrenceType = type;
  toggleQuarterly.classList.toggle('active', type === 'quarterly');
  toggleInterval.classList.toggle('active', type === 'interval');
  quarterlyFields.style.display = type === 'quarterly' ? '' : 'none';
  intervalFields.style.display = type === 'interval' ? '' : 'none';
}

toggleQuarterly.addEventListener('click', () => setRecurrenceType('quarterly'));
toggleInterval.addEventListener('click', () => setRecurrenceType('interval'));

instructionsInput.addEventListener('input', () => {
  previewEl.innerHTML = instructionsInput.value ? marked.parse(instructionsInput.value) : '';
});

function fillForm(task) {
  document.getElementById('title').value = task.title;
  instructionsInput.value = task.instructions || '';
  previewEl.innerHTML = task.instructions ? marked.parse(task.instructions) : '';
  setRecurrenceType(task.recurrence_type);

  if (task.recurrence_type === 'quarterly') {
    document.querySelectorAll('input[name="quarter"]').forEach((cb) => {
      cb.checked = task.quarters.includes(Number(cb.value));
    });
  } else {
    document.getElementById('interval_min_years').value = task.interval_min_years;
    document.getElementById('interval_max_years').value = task.interval_max_years;
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
}

async function init() {
  if (isEditing) {
    document.getElementById('page-title').textContent = 'Muokkaa tehtävää';
    deleteBtn.style.display = '';
    detailSections.style.display = '';
    document.getElementById('complete-date').value = todayISO();
    await refreshTask();
  } else {
    setRecurrenceType('quarterly');
    renderPendingFiles();
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    title: document.getElementById('title').value,
    instructions: instructionsInput.value,
    recurrence_type: recurrenceType,
  };
  if (recurrenceType === 'quarterly') {
    data.quarters = Array.from(document.querySelectorAll('input[name="quarter"]:checked')).map((cb) => Number(cb.value));
  } else {
    data.interval_min_years = Number(document.getElementById('interval_min_years').value);
    data.interval_max_years = Number(document.getElementById('interval_max_years').value);
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

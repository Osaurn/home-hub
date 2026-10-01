const params = new URLSearchParams(window.location.search);
const equipmentId = params.get('id');
const isEditing = Boolean(equipmentId);

const instructionsInput = document.getElementById('instructions');
const previewEl = document.getElementById('instructions-preview');
const instructionsToggle = document.getElementById('instructions-toggle');
const deleteBtn = document.getElementById('delete-btn');
const TEXT_FIELDS = ['name', 'category', 'location', 'model', 'serial_number', 'purchase_date', 'warranty_expires', 'warranty_notes'];

let pendingFiles = [];
let selectedIcon = null; // null = automatic
let instructionsMode = 'edit';

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

function renderIconPicker() {
  const picker = document.getElementById('icon-picker');
  picker.innerHTML =
    `<button type="button" class="icon-choice auto${selectedIcon === null ? ' active' : ''}" data-icon="">Automaattinen</button>` +
    EquipmentIcons.PICKER_ICONS.map(
      (i) => `<button type="button" class="icon-choice${selectedIcon === i ? ' active' : ''}" data-icon="${i}" aria-label="Kuvake ${i}">${i}</button>`
    ).join('');
  picker.querySelectorAll('.icon-choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedIcon = btn.dataset.icon || null;
      renderIconPicker();
    });
  });
}

function renderManuals(manuals) {
  const list = document.getElementById('manual-list');
  document.getElementById('manual-hint').style.display = 'none';
  if (manuals.length === 0) {
    list.innerHTML = '<li class="muted">Ei käyttöohjeita.</li>';
    return;
  }
  list.innerHTML = manuals
    .map(
      (m) => `
      <li>
        <a href="/api/manuals/${m.id}" target="_blank">${escapeHtml(m.filename)}</a>
        <button type="button" class="btn danger small" data-manual-id="${m.id}">Poista</button>
      </li>`
    )
    .join('');
  list.querySelectorAll('button[data-manual-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Poistetaanko käyttöohje?')) return;
      await api.deleteManual(btn.dataset.manualId);
      refreshEquipment();
    });
  });
}

function renderPendingFiles() {
  const list = document.getElementById('manual-list');
  const hint = document.getElementById('manual-hint');
  hint.style.display = pendingFiles.length === 0 ? '' : 'none';
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

async function refreshEquipment() {
  const e = await api.getEquipment(equipmentId);
  for (const f of TEXT_FIELDS) document.getElementById(f).value = e[f] || '';
  instructionsInput.value = e.instructions || '';
  selectedIcon = e.icon || null;
  renderIconPicker();
  setInstructionsMode(e.instructions ? 'preview' : 'edit');
  renderManuals(e.manuals);
}

async function loadLocationOptions() {
  try {
    const list = await api.getEquipmentList();
    const locations = [...new Set(list.map((e) => e.location).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fi'));
    document.getElementById('location-options').innerHTML = locations
      .map((l) => `<option value="${escapeHtml(l)}"></option>`)
      .join('');
  } catch {
    // suggestions are optional
  }
}

async function init() {
  loadLocationOptions();
  if (isEditing) {
    document.getElementById('page-title').textContent = 'Muokkaa laitetta';
    document.getElementById('cancel-link').href = `equipment-detail.html?id=${equipmentId}`;
    deleteBtn.style.display = '';
    await refreshEquipment();
  } else {
    setInstructionsMode('edit');
    renderIconPicker();
    renderPendingFiles();
  }
}

document.getElementById('equipment-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const data = { instructions: instructionsInput.value, icon: selectedIcon };
  for (const f of TEXT_FIELDS) data[f] = document.getElementById(f).value;

  try {
    if (isEditing) {
      await api.updateEquipment(equipmentId, data);
      window.location.href = `equipment-detail.html?id=${equipmentId}`;
    } else {
      const created = await api.createEquipment(data);
      if (pendingFiles.length > 0) {
        try {
          await api.uploadManuals(created.id, pendingFiles);
        } catch (err) {
          alert(`Laite tallennettiin, mutta käyttöohjeiden lataus epäonnistui: ${err.message}`);
        }
      }
      window.location.href = `equipment-detail.html?id=${created.id}`;
    }
  } catch (err) {
    alert(err.message);
  }
});

deleteBtn.addEventListener('click', async () => {
  if (!confirm('Poistetaanko laite ja sen käyttöohjeet pysyvästi? Laitteeseen liitetyt tehtävät säilyvät, mutta menettävät yhteyden laitteeseen.')) return;
  try {
    await api.deleteEquipment(equipmentId);
    window.location.href = 'equipment.html';
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('manual-input').addEventListener('change', async (ev) => {
  const files = Array.from(ev.target.files);
  if (files.length === 0) return;
  ev.target.value = '';

  if (isEditing) {
    try {
      await api.uploadManuals(equipmentId, files);
      refreshEquipment();
    } catch (err) {
      alert(err.message);
    }
  } else {
    pendingFiles = pendingFiles.concat(files);
    renderPendingFiles();
  }
});

init().catch((err) => alert(err.message));

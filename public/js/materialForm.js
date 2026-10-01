const params = new URLSearchParams(window.location.search);
const materialId = params.get('id');
const isEditing = Boolean(materialId);

const notesInput = document.getElementById('notes');
const previewEl = document.getElementById('notes-preview');
const notesToggle = document.getElementById('notes-toggle');
const deleteBtn = document.getElementById('delete-btn');
const hasColor = document.getElementById('has-color');
const colorInput = document.getElementById('color_hex');
const TEXT_FIELDS = ['name', 'category', 'location', 'brand', 'product', 'color_name', 'color_code', 'finish', 'quantity', 'supplier', 'purchased_at'];
const CATEGORY_SUGGESTIONS = ['Maalit', 'Saumaus ja tiivistys', 'Laatat', 'Puutavara', 'Lattiat', 'Eristeet', 'Kiinnitys ja liimat', 'Muu'];

let pendingFiles = [];
let selectedIcon = null; // null = automatic
let notesMode = 'edit';

function setNotesMode(mode) {
  notesMode = mode;
  if (mode === 'preview') {
    notesInput.style.display = 'none';
    previewEl.style.display = '';
    previewEl.innerHTML = notesInput.value ? marked.parse(notesInput.value) : '<p class="muted">Ei muistiinpanoja.</p>';
    notesToggle.textContent = 'Muokkaa';
  } else {
    notesInput.style.display = '';
    previewEl.style.display = 'none';
    notesToggle.textContent = 'Esikatselu';
  }
}

notesToggle.addEventListener('click', () => setNotesMode(notesMode === 'edit' ? 'preview' : 'edit'));
hasColor.addEventListener('change', () => {
  colorInput.disabled = !hasColor.checked;
});

function renderIconPicker() {
  const picker = document.getElementById('icon-picker');
  picker.innerHTML =
    `<button type="button" class="icon-choice auto${selectedIcon === null ? ' active' : ''}" data-icon="">Automaattinen</button>` +
    MaterialIcons.PICKER_ICONS.map(
      (i) => `<button type="button" class="icon-choice${selectedIcon === i ? ' active' : ''}" data-icon="${i}" aria-label="Kuvake ${i}">${i}</button>`
    ).join('');
  picker.querySelectorAll('.icon-choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedIcon = btn.dataset.icon || null;
      renderIconPicker();
    });
  });
}

function renderFiles(files) {
  const list = document.getElementById('file-list');
  document.getElementById('file-hint').style.display = 'none';
  if (files.length === 0) {
    list.innerHTML = '<li class="muted">Ei tiedostoja.</li>';
    return;
  }
  list.innerHTML = files
    .map(
      (f) => `
      <li>
        <a href="/api/material-files/${f.id}" target="_blank">${escapeHtml(f.filename)}</a>
        <button type="button" class="btn danger small" data-file-id="${f.id}">Poista</button>
      </li>`
    )
    .join('');
  list.querySelectorAll('button[data-file-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Poistetaanko tiedosto?')) return;
      await api.deleteMaterialFile(btn.dataset.fileId);
      refreshMaterial();
    });
  });
}

function renderPendingFiles() {
  const list = document.getElementById('file-list');
  document.getElementById('file-hint').style.display = pendingFiles.length === 0 ? '' : 'none';
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

async function refreshMaterial() {
  const m = await api.getMaterial(materialId);
  for (const f of TEXT_FIELDS) document.getElementById(f).value = m[f] || '';
  notesInput.value = m.notes || '';
  selectedIcon = m.icon || null;
  hasColor.checked = Boolean(m.color_hex);
  colorInput.disabled = !hasColor.checked;
  if (m.color_hex) colorInput.value = m.color_hex;
  renderIconPicker();
  setNotesMode(m.notes ? 'preview' : 'edit');
  renderFiles(m.files);
}

async function loadSuggestions() {
  let list = [];
  try {
    list = await api.getMaterials();
  } catch {
    // suggestions are optional
  }
  const options = (values) => values.map((v) => `<option value="${escapeHtml(v)}"></option>`).join('');
  const existingCategories = list.map((m) => m.category).filter(Boolean);
  const categories = [...new Set([...CATEGORY_SUGGESTIONS, ...existingCategories])];
  const locations = [...new Set(list.map((m) => m.location).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fi'));
  document.getElementById('category-options').innerHTML = options(categories);
  document.getElementById('location-options').innerHTML = options(locations);
}

async function init() {
  loadSuggestions();
  if (isEditing) {
    document.getElementById('page-title').textContent = 'Muokkaa materiaalia';
    document.getElementById('cancel-link').href = `material-detail.html?id=${materialId}`;
    deleteBtn.style.display = '';
    await refreshMaterial();
  } else {
    setNotesMode('edit');
    renderIconPicker();
    renderPendingFiles();
  }
}

document.getElementById('material-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const data = { notes: notesInput.value, icon: selectedIcon, color_hex: hasColor.checked ? colorInput.value : null };
  for (const f of TEXT_FIELDS) data[f] = document.getElementById(f).value;

  try {
    if (isEditing) {
      await api.updateMaterial(materialId, data);
      window.location.href = `material-detail.html?id=${materialId}`;
    } else {
      const created = await api.createMaterial(data);
      if (pendingFiles.length > 0) {
        try {
          await api.uploadMaterialFiles(created.id, pendingFiles);
        } catch (err) {
          alert(`Materiaali tallennettiin, mutta tiedostojen lataus epäonnistui: ${err.message}`);
        }
      }
      window.location.href = `material-detail.html?id=${created.id}`;
    }
  } catch (err) {
    alert(err.message);
  }
});

deleteBtn.addEventListener('click', async () => {
  if (!confirm('Poistetaanko materiaali ja sen tiedostot pysyvästi?')) return;
  try {
    await api.deleteMaterial(materialId);
    window.location.href = 'materials.html';
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('file-input').addEventListener('change', async (ev) => {
  const files = Array.from(ev.target.files);
  if (files.length === 0) return;
  ev.target.value = '';

  if (isEditing) {
    try {
      await api.uploadMaterialFiles(materialId, files);
      refreshMaterial();
    } catch (err) {
      alert(err.message);
    }
  } else {
    pendingFiles = pendingFiles.concat(files);
    renderPendingFiles();
  }
});

init().catch((err) => alert(err.message));

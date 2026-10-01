const FILTER_STORAGE_KEY = 'materialFilters';
const FILTER_ROWS = [
  { field: 'category', label: 'Tyyppi' },
  { field: 'location', label: 'Käyttökohde' },
];
const SEARCH_FIELDS = ['name', 'category', 'location', 'brand', 'product', 'color_name', 'color_code', 'finish', 'supplier', 'notes'];

let allMaterials = [];
let filters = loadFilters();
let searchText = '';

function emptyFilters() {
  return { category: null, location: null };
}

function loadFilters() {
  try {
    return { ...emptyFilters(), ...JSON.parse(sessionStorage.getItem(FILTER_STORAGE_KEY) || '{}') };
  } catch {
    return emptyFilters();
  }
}

function saveFilters() {
  try {
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // remembering the filter is optional
  }
}

function materialTileHtml(m) {
  const product = [m.brand, m.product].filter(Boolean).map(escapeHtml).join(' · ');
  const color = [m.color_name, m.color_code].filter(Boolean).map(escapeHtml).join(' · ');
  const swatch = colorSwatchHtml(m.color_hex);
  const files = m.file_count === 1 ? '1 tiedosto' : `${m.file_count} tiedostoa`;
  return `
    <a class="equipment-tile card" href="material-detail.html?id=${m.id}">
      <span class="equipment-icon" aria-hidden="true">${MaterialIcons.materialIcon(m)}</span>
      <span class="equipment-tile-name">${escapeHtml(m.name)}</span>
      ${m.category ? `<span class="card-meta">${escapeHtml(m.category)}</span>` : ''}
      ${product ? `<span class="card-meta">${product}</span>` : ''}
      ${swatch || color ? `<span class="card-meta color-line">${swatch}${color}</span>` : ''}
      ${m.location ? `<span class="card-meta">${escapeHtml(m.location)}</span>` : ''}
      ${m.file_count > 0 ? `<span class="tag-pills"><span class="tag-pill">${files}</span></span>` : ''}
    </a>`;
}

function matchesSearch(m) {
  const q = searchText.trim().toLowerCase();
  if (!q) return true;
  const haystack = SEARCH_FIELDS.map((f) => m[f] || '').join(' ').toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

function renderFilters() {
  const bar = document.getElementById('material-filters');
  const rows = FILTER_ROWS.map((row) => ({ ...row, options: distinctOptions(allMaterials, row.field) }));

  // Drop a saved filter whose value no longer exists.
  for (const row of rows) {
    if (filters[row.field] && !row.options.some((o) => o.key === filters[row.field])) filters[row.field] = null;
  }

  bar.innerHTML = rows
    .filter((row) => row.options.length >= 2)
    .map(
      (row) => `
      <div class="equipment-filter-row">
        <span class="equipment-filter-label">${row.label}</span>
        <div class="tag-chips">
          <button type="button" class="tag-chip filter-chip${filters[row.field] === null ? ' active' : ''}" data-field="${row.field}" data-key="">Kaikki</button>
          ${row.options
            .map(
              (o) =>
                `<button type="button" class="tag-chip filter-chip${filters[row.field] === o.key ? ' active' : ''}" data-field="${row.field}" data-key="${escapeHtml(o.key)}">${escapeHtml(o.label)}</button>`
            )
            .join('')}
        </div>
      </div>`
    )
    .join('');

  bar.querySelectorAll('.filter-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      filters[btn.dataset.field] = btn.dataset.key || null;
      saveFilters();
      renderFilters();
      renderGrid();
    });
  });
}

function renderGrid() {
  const container = document.getElementById('material-list');
  if (allMaterials.length === 0) {
    container.innerHTML = '<div class="empty-state">Ei vielä materiaaleja. Lisää ensimmäinen materiaali yllä olevasta painikkeesta.</div>';
    return;
  }
  const visible = allMaterials.filter(
    (m) => FILTER_ROWS.every((row) => !filters[row.field] || filterKey(m[row.field]) === filters[row.field]) && matchesSearch(m)
  );
  if (visible.length === 0) {
    container.innerHTML = `<div class="empty-state">Ei materiaaleja näillä hakuehdoilla.
      <div><button type="button" class="btn secondary small" id="clear-filters">Tyhjennä haku ja suodattimet</button></div></div>`;
    document.getElementById('clear-filters').addEventListener('click', () => {
      filters = emptyFilters();
      searchText = '';
      document.getElementById('material-search').value = '';
      saveFilters();
      renderFilters();
      renderGrid();
    });
    return;
  }
  container.innerHTML = visible.map(materialTileHtml).join('');
}

document.getElementById('material-search').addEventListener('input', (e) => {
  searchText = e.target.value;
  renderGrid();
});

async function loadMaterials() {
  allMaterials = await api.getMaterials();
  renderFilters();
  renderGrid();
}

loadMaterials().catch((err) => {
  document.getElementById('material-list').innerHTML = `<div class="empty-state">Virhe ladattaessa: ${escapeHtml(err.message)}</div>`;
});

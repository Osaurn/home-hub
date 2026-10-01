const FILTER_STORAGE_KEY = 'equipmentFilters';
const FILTER_ROWS = [
  { field: 'location', label: 'Sijainti' },
  { field: 'category', label: 'Liittyy' },
];

let allEquipment = [];
let filters = loadFilters();

function loadFilters() {
  try {
    return { location: null, category: null, ...JSON.parse(sessionStorage.getItem(FILTER_STORAGE_KEY) || '{}') };
  } catch {
    return { location: null, category: null };
  }
}

function saveFilters() {
  try {
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // remembering the filter is optional
  }
}

function equipmentTileHtml(e) {
  const badges = [];
  if (e.overdue_count > 0) badges.push(`<span class="badge status-overdue">Myöhässä ${e.overdue_count}</span>`);
  if (e.due_count > 0) badges.push(`<span class="badge status-due">Ajankohtainen ${e.due_count}</span>`);
  const warranty = warrantyBadgeHtml(e.warranty);
  if (warranty) badges.push(warranty);
  const status = e.overdue_count > 0 ? ' status-overdue' : e.due_count > 0 ? ' status-due' : '';
  const meta = [e.location, e.model].filter(Boolean).map(escapeHtml).join(' · ');
  const manuals = e.manual_count === 1 ? '1 käyttöohje' : `${e.manual_count} käyttöohjetta`;
  const contents = [
    e.manual_count > 0 ? manuals : null,
    e.instructions ? 'Ohjeet ja muistiinpanot' : null,
  ].filter(Boolean);
  const pills = contents.length
    ? `<div class="tag-pills">${contents.map((c) => `<span class="tag-pill">${c}</span>`).join('')}</div>`
    : '<div class="card-meta">Ei vielä ohjeita</div>';
  // Plain-text glance at the instructions: drop Markdown markers.
  const plain = (e.instructions || '').replace(/(^|\s)\d+\.(?=\s)|[#*_`>\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const snippet = plain ? `<div class="equipment-snippet">${escapeHtml(plain)}</div>` : '';
  const tasks = e.task_count === 1 ? '1 tehtävä' : `${e.task_count} tehtävää`;
  return `
    <a class="equipment-tile card${status}" href="equipment-detail.html?id=${e.id}">
      <span class="equipment-icon" aria-hidden="true">${EquipmentIcons.equipmentIcon(e)}</span>
      <span class="equipment-tile-name">${escapeHtml(e.name)}</span>
      ${e.category ? `<span class="card-meta">${escapeHtml(e.category)}</span>` : ''}
      ${meta ? `<span class="card-meta">${meta}</span>` : ''}
      <span class="card-meta">${tasks}</span>
      ${badges.length ? `<span class="equipment-tile-badges">${badges.join(' ')}</span>` : ''}
      ${pills}
      ${snippet}
    </a>`;
}

function renderFilters() {
  const bar = document.getElementById('equipment-filters');
  const rows = FILTER_ROWS.map((row) => ({ ...row, options: distinctOptions(allEquipment, row.field) })).filter(
    (row) => row.options.length >= 2
  );

  // Drop a saved filter whose value no longer exists.
  for (const row of FILTER_ROWS) {
    if (filters[row.field] && !distinctOptions(allEquipment, row.field).some((o) => o.key === filters[row.field])) {
      filters[row.field] = null;
    }
  }

  bar.innerHTML = rows
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
  const container = document.getElementById('equipment-list');
  if (allEquipment.length === 0) {
    container.innerHTML = '<div class="empty-state">Ei vielä laitteita. Lisää ensimmäinen laite yllä olevasta painikkeesta.</div>';
    return;
  }
  const visible = allEquipment.filter((e) =>
    FILTER_ROWS.every((row) => !filters[row.field] || filterKey(e[row.field]) === filters[row.field])
  );
  if (visible.length === 0) {
    container.innerHTML = `<div class="empty-state">Ei laitteita näillä suodattimilla.
      <div><button type="button" class="btn secondary small" id="clear-filters">Tyhjennä suodattimet</button></div></div>`;
    document.getElementById('clear-filters').addEventListener('click', () => {
      filters = { location: null, category: null };
      saveFilters();
      renderFilters();
      renderGrid();
    });
    return;
  }
  container.innerHTML = visible.map(equipmentTileHtml).join('');
}

async function loadEquipment() {
  allEquipment = await api.getEquipmentList();
  renderFilters();
  renderGrid();
}

loadEquipment().catch((err) => {
  document.getElementById('equipment-list').innerHTML = `<div class="empty-state">Virhe ladattaessa: ${escapeHtml(err.message)}</div>`;
});

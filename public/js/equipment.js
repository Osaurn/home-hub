function equipmentCardHtml(e) {
  const badges = [];
  if (e.overdue_count > 0) badges.push(`<span class="badge status-overdue">Myöhässä ${e.overdue_count}</span>`);
  if (e.due_count > 0) badges.push(`<span class="badge status-due">Ajankohtainen ${e.due_count}</span>`);
  const status = e.overdue_count > 0 ? ' status-overdue' : e.due_count > 0 ? ' status-due' : '';
  const meta = [e.category, e.location, e.model].filter(Boolean).map(escapeHtml).join(' · ');
  const manuals = e.manual_count === 1 ? '1 käyttöohje' : `${e.manual_count} käyttöohjetta`;
  const tasks = e.task_count === 1 ? '1 tehtävä' : `${e.task_count} tehtävää`;
  return `
    <div class="card${status}">
      <div class="card-header">
        <div>
          <div class="card-title"><a href="equipment-detail.html?id=${e.id}">${escapeHtml(e.name)}</a></div>
          ${meta ? `<div class="card-meta">${meta}</div>` : ''}
          <div class="card-meta">${manuals} · ${tasks}</div>
        </div>
        <div>${badges.join(' ')} ${warrantyBadgeHtml(e.warranty)}</div>
      </div>
      <div class="form-actions">
        <a class="btn small" href="equipment-detail.html?id=${e.id}">Avaa ohjeet</a>
        <a class="btn secondary small" href="equipment-form.html?id=${e.id}">Muokkaa</a>
      </div>
    </div>`;
}

async function loadEquipment() {
  const list = await api.getEquipmentList();
  const container = document.getElementById('equipment-list');
  container.innerHTML =
    list.length === 0
      ? '<div class="empty-state">Ei vielä laitteita. Lisää ensimmäinen laite yllä olevasta painikkeesta.</div>'
      : list.map(equipmentCardHtml).join('');
}

loadEquipment().catch((err) => {
  document.getElementById('equipment-list').innerHTML = `<div class="empty-state">Virhe ladattaessa: ${escapeHtml(err.message)}</div>`;
});

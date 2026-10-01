const materialId = new URLSearchParams(window.location.search).get('id');
const fileUrl = (f) => `/api/material-files/${f.id}`;
const isImage = (f) => /^image\/(png|jpeg|gif|webp)$/.test(f.mime_type || '');

function factsHtml(m) {
  const colorText = [m.color_name, m.color_code].filter(Boolean).map(escapeHtml).join(' · ');
  const swatch = colorSwatchHtml(m.color_hex);
  const rows = [
    ['Tyyppi', m.category ? escapeHtml(m.category) : ''],
    ['Käyttökohde', m.location ? escapeHtml(m.location) : ''],
    ['Merkki', m.brand ? escapeHtml(m.brand) : ''],
    ['Tuote', m.product ? escapeHtml(m.product) : ''],
    ['Väri', swatch || colorText ? `${swatch}${colorText}` : ''],
    ['Kiilto / pinta', m.finish ? escapeHtml(m.finish) : ''],
    ['Määrä', m.quantity ? escapeHtml(m.quantity) : ''],
    ['Ostopaikka', m.supplier ? escapeHtml(m.supplier) : ''],
    ['Ostopäivä', m.purchased_at || ''],
  ].filter(([, v]) => v);
  if (rows.length === 0) return '';
  return `<dl class="equipment-facts">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
}

function render(m) {
  document.title = `${m.name} — Kalle Kotiapuri`;
  const images = m.files.filter(isImage);
  const others = m.files.filter((f) => !isImage(f));

  document.getElementById('detail').innerHTML = `
    <div class="card-header">
      <h2 style="margin:0;"><span aria-hidden="true">${MaterialIcons.materialIcon(m)}</span> ${escapeHtml(m.name)}</h2>
      <a class="btn secondary small" href="material-form.html?id=${m.id}">Muokkaa</a>
    </div>
    ${factsHtml(m)}

    ${
      m.notes
        ? `<h2 class="section-title">Muistiinpanot</h2><div class="card instructions-preview">${marked.parse(m.notes)}</div>`
        : ''
    }

    <h2 class="section-title">Kuvat ja tiedostot</h2>
    <div class="card">
      ${m.files.length === 0 ? '<p class="muted">Ei kuvia tai tiedostoja. Lisää niitä muokkaussivulta.</p>' : ''}
      ${
        images.length
          ? `<div class="photo-grid">${images
              .map(
                (f) =>
                  `<a href="${fileUrl(f)}" target="_blank" title="${escapeHtml(f.filename)}"><img class="material-photo" src="${fileUrl(f)}" alt="${escapeHtml(f.filename)}" loading="lazy" /></a>`
              )
              .join('')}</div>`
          : ''
      }
      <div id="material-files"></div>
    </div>`;
  if (others.length) {
    renderManualViewer(document.getElementById('material-files'), others, { collapsedByDefault: true, urlFor: fileUrl });
  }
}

if (!materialId) {
  window.location.href = 'materials.html';
} else {
  api.getMaterial(materialId).then(render).catch((err) => {
    document.getElementById('detail').innerHTML = `<div class="empty-state">Virhe ladattaessa: ${escapeHtml(err.message)}</div>`;
  });
}

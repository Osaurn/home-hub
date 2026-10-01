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

function viewerHtml(m, urlFor) {
  const url = urlFor(m);
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

// options.collapsedByDefault: start with the preview hidden and don't read or
// write the saved preference (used on the task page, where the preview
// should only appear when the user asks for it).
function renderManualViewer(container, manuals, options = {}) {
  const collapsedByDefault = Boolean(options.collapsedByDefault);
  const urlFor = options.urlFor || ((m) => `/api/manuals/${m.id}`);
  let openState = !collapsedByDefault;
  if (manuals.length === 0) {
    container.innerHTML = `<p class="muted">${options.emptyText || 'Ei käyttöohjeita. Lisää niitä muokkaussivulta.'}</p>`;
    return;
  }
  const previewable = manuals.filter(isPreviewable);
  const others = manuals.filter((m) => !isPreviewable(m));
  let selected = previewable[0] || null;

  function draw() {
    const open = collapsedByDefault ? openState : previewOpen();
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
      ? `<button type="button" class="btn secondary small preview-toggle">${open ? 'Piilota esikatselu' : 'Näytä esikatselu'}</button>`
      : '';
    const otherLinks = others.length
      ? `<ul class="attachment-list">${others
          .map((m) => `<li><a href="${urlFor(m)}" target="_blank">${escapeHtml(m.filename)}</a></li>`)
          .join('')}</ul>`
      : '';
    container.innerHTML = `
      ${selected ? `<div class="field-header">${chips}${toggle}</div>` : ''}
      ${selected && open ? `<div class="manual-viewer">${viewerHtml(selected, urlFor)}</div>` : ''}
      ${otherLinks}`;

    container.querySelectorAll('[data-manual-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selected = previewable.find((m) => m.id === Number(btn.dataset.manualId));
        if (collapsedByDefault) openState = true;
        draw();
      });
    });
    const t = container.querySelector('.preview-toggle');
    if (t) {
      t.addEventListener('click', () => {
        if (collapsedByDefault) {
          openState = !open;
        } else {
          try {
            localStorage.setItem(PREVIEW_KEY, open ? '0' : '1');
          } catch {}
        }
        draw();
      });
    }
  }
  draw();
}

const api = {
  async request(method, url, body) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Virhe (${res.status})`);
    }
    if (res.status === 204) return null;
    return res.json();
  },

  getDashboard: () => api.request('GET', '/api/dashboard'),
  getQuarterTasks: (q) => api.request('GET', `/api/dashboard/quarters/${q}`),
  getTasks: () => api.request('GET', '/api/tasks'),
  getTask: (id) => api.request('GET', `/api/tasks/${id}`),
  createTask: (data) => api.request('POST', '/api/tasks', data),
  updateTask: (id, data) => api.request('PUT', `/api/tasks/${id}`, data),
  deleteTask: (id) => api.request('DELETE', `/api/tasks/${id}`),

  completeTask: (id, data) => api.request('POST', `/api/tasks/${id}/complete`, data),
  deleteCompletion: (id) => api.request('DELETE', `/api/completions/${id}`),

  getTags: () => api.request('GET', '/api/tags'),
  createTag: (name) => api.request('POST', '/api/tags', { name }),
  deleteTag: (id) => api.request('DELETE', `/api/tags/${id}`),

  getEquipmentList: () => api.request('GET', '/api/equipment'),
  getEquipment: (id) => api.request('GET', `/api/equipment/${id}`),
  createEquipment: (data) => api.request('POST', '/api/equipment', data),
  updateEquipment: (id, data) => api.request('PUT', `/api/equipment/${id}`, data),
  deleteEquipment: (id) => api.request('DELETE', `/api/equipment/${id}`),
  deleteManual: (id) => api.request('DELETE', `/api/manuals/${id}`),
  async uploadManuals(equipmentId, files) {
    const formData = new FormData();
    for (const file of files) formData.append('files', file);
    const res = await fetch(`/api/equipment/${equipmentId}/manuals`, { method: 'POST', body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Virhe (${res.status})`);
    }
    return res.json();
  },

  getHistory: (limit) => api.request('GET', `/api/history${limit ? `?limit=${limit}` : ''}`),

  deleteAttachment: (id) => api.request('DELETE', `/api/attachments/${id}`),
  async uploadAttachments(taskId, files) {
    const formData = new FormData();
    for (const file of files) formData.append('files', file);
    const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: 'POST', body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Virhe (${res.status})`);
    }
    return res.json();
  },
};

const QUARTER_LABELS = {
  1: '1. vuosineljännes (tammi–maalis)',
  2: '2. vuosineljännes (huhti–kesä)',
  3: '3. vuosineljännes (heinä–syys)',
  4: '4. vuosineljännes (loka–joulu)',
};

const QUARTER_SHORT = { 1: 'Q1', 2: 'Q2', 3: 'Q3', 4: 'Q4' };

const MONTH_NAMES = {
  1: 'Tammikuu',
  2: 'Helmikuu',
  3: 'Maaliskuu',
  4: 'Huhtikuu',
  5: 'Toukokuu',
  6: 'Kesäkuu',
  7: 'Heinäkuu',
  8: 'Elokuu',
  9: 'Syyskuu',
  10: 'Lokakuu',
  11: 'Marraskuu',
  12: 'Joulukuu',
};

const STATUS_LABELS = {
  due: 'Ajankohtainen',
  overdue: 'Myöhässä',
  done: 'Tehty',
  upcoming: 'Tulossa',
};

function formatCheckpoint(checkpoint) {
  if (checkpoint.type === 'quarterly') {
    return `${QUARTER_SHORT[checkpoint.quarter]} ${checkpoint.year}`;
  }
  if (checkpoint.type === 'monthly') {
    return `${MONTH_NAMES[checkpoint.month]} ${checkpoint.year}`;
  }
  if (!checkpoint.lastCompleted) {
    if (checkpoint.dueFrom) return `Ei vielä tehty, ajankohtainen ${checkpoint.dueFrom}`;
    return 'Ei koskaan tehty';
  }
  return `Viimeksi tehty ${checkpoint.lastCompleted}`;
}

function formatRecurrence(task) {
  if (task.recurrence_type === 'quarterly') {
    return (task.quarters || []).map((q) => QUARTER_SHORT[q]).join(', ');
  }
  if (task.recurrence_type === 'monthly') {
    return (task.months || []).map((m) => MONTH_NAMES[m]).join(', ');
  }
  return `Joka ${task.interval_min_years}–${task.interval_max_years} vuosi`;
}

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function tagChipsHtml(tags) {
  if (!tags || tags.length === 0) return '';
  return `<div class="tag-pills">${tags
    .map((t) => `<span class="tag-pill">${escapeHtml(t.name)}</span>`)
    .join('')}</div>`;
}

function historyEntryHtml(entry) {
  return `
    <div class="card">
      <div class="card-title"><a href="task-form.html?id=${entry.task_id}">${escapeHtml(entry.task_title)}</a></div>
      ${entry.equipment_name ? `<div class="card-meta">Laite: <a href="equipment-detail.html?id=${entry.equipment_id}">${escapeHtml(entry.equipment_name)}</a></div>` : ''}
      <div class="card-meta">${entry.completed_at}${entry.note ? ' — ' + escapeHtml(entry.note) : ''}</div>
    </div>`;
}

function warrantyBadgeHtml(warranty) {
  if (!warranty) return '';
  const labels = { active: 'Takuu voimassa', expiring: 'Takuu päättymässä', expired: 'Takuu päättynyt' };
  const classes = { active: 'done', expiring: 'due', expired: 'upcoming' };
  return `<span class="badge status-${classes[warranty.status]}">${labels[warranty.status]}</span>`;
}

function warrantyText(e) {
  if (!e.warranty) return '';
  const d = e.warranty.daysLeft;
  const left = d < 0 ? 'päättynyt' : d === 0 ? 'päättyy tänään' : `${d} pv jäljellä`;
  return `${e.warranty_expires} (${left})`;
}

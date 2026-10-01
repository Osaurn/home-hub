// Helpers shared by the filterable grids (Laitteet, Materiaalit).

// "Ullakko" and "ullakko " are the same place.
function filterKey(value) {
  return (value || '').trim().toLowerCase();
}

// Distinct non-empty values of items[field], merged case-insensitively and
// labelled with a capital first letter, sorted by Finnish collation.
function distinctOptions(items, field) {
  const seen = new Map();
  for (const item of items) {
    const key = filterKey(item[field]);
    if (key && !seen.has(key)) seen.set(key, key.charAt(0).toUpperCase() + item[field].trim().slice(1));
  }
  return [...seen].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label, 'fi'));
}

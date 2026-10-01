const test = require('node:test');
const assert = require('node:assert');
const { materialIcon, FALLBACK } = require('../public/js/materialIcons');

test('matches on category, case-insensitively', () => {
  assert.strictEqual(materialIcon({ category: 'Maalit', name: 'X' }), '🎨');
  assert.strictEqual(materialIcon({ category: 'SAUMAUS JA TIIVISTYS', name: 'X' }), '🧴');
  assert.strictEqual(materialIcon({ category: 'Laatat', name: 'X' }), '🔲');
});

test('falls back to the name when the category does not match', () => {
  assert.strictEqual(materialIcon({ category: 'Muu', name: 'Ulkomaali' }), '🎨');
  assert.strictEqual(materialIcon({ category: null, name: 'Terassilauta' }), '🪵');
  assert.strictEqual(materialIcon({ name: 'Saumausaine' }), '🧴');
});

test('category takes priority over name', () => {
  assert.strictEqual(materialIcon({ category: 'Maalit', name: 'Laattamaali' }), '🎨');
});

test('unknown material gets the fallback icon', () => {
  assert.strictEqual(materialIcon({ category: 'Outo', name: 'Zzz' }), FALLBACK);
  assert.strictEqual(materialIcon({ name: 'Zzz' }), FALLBACK);
});

test('manual override wins', () => {
  assert.strictEqual(materialIcon({ icon: '🏠', category: 'Maalit', name: 'X' }), '🏠');
});

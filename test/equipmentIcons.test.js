const test = require('node:test');
const assert = require('node:assert');
const { equipmentIcon, FALLBACK } = require('../public/js/equipmentIcons');

test('matches on category, case-insensitively', () => {
  assert.strictEqual(equipmentIcon({ category: 'Ilmanvaihto', name: 'X' }), '🌬️');
  assert.strictEqual(equipmentIcon({ category: 'LÄMMITYS', name: 'X' }), '🔥');
  assert.strictEqual(equipmentIcon({ category: 'Vesi ja viemäri', name: 'X' }), '🚰');
});

test('falls back to the name when the category does not match', () => {
  assert.strictEqual(equipmentIcon({ category: 'Muu', name: 'Pesukone' }), '🧺');
  assert.strictEqual(equipmentIcon({ category: null, name: 'Ilmalämpöpumppu' }), '🔥');
});

test('category takes priority over name', () => {
  assert.strictEqual(equipmentIcon({ category: 'Lämmitys', name: 'Vesikiertopumppu' }), '🔥');
});

test('unknown equipment gets the fallback icon', () => {
  assert.strictEqual(equipmentIcon({ category: 'Outo', name: 'Zzz' }), FALLBACK);
  assert.strictEqual(equipmentIcon({ name: 'Zzz' }), FALLBACK);
});

test('"automaattinen" does not look like a car', () => {
  assert.strictEqual(equipmentIcon({ name: 'Automaattinen ovi' }), '🔒');
});

test('manual override wins', () => {
  assert.strictEqual(equipmentIcon({ icon: '🏠', category: 'Lämmitys', name: 'X' }), '🏠');
});

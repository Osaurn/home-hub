const test = require('node:test');
const assert = require('node:assert');
const { computeKalleMood, pickMessage, MESSAGES } = require('../public/js/kalleMood.js');

test('computeKalleMood thresholds', () => {
  assert.strictEqual(computeKalleMood(0, 0), 'excited');
  assert.strictEqual(computeKalleMood(0, 1), 'happy');
  assert.strictEqual(computeKalleMood(0, 3), 'happy');
  assert.strictEqual(computeKalleMood(0, 4), 'confident');
  assert.strictEqual(computeKalleMood(1, 0), 'concerned');
  assert.strictEqual(computeKalleMood(2, 9), 'concerned');
  assert.strictEqual(computeKalleMood(3, 0), 'exhausted');
  assert.strictEqual(computeKalleMood(5, 0), 'exhausted');
  assert.strictEqual(computeKalleMood(6, 0), 'sad');
});

test('every mood has messages and pickMessage returns one', () => {
  for (const mood of Object.keys(MESSAGES)) {
    assert.ok(MESSAGES[mood].includes(pickMessage(mood)));
  }
});

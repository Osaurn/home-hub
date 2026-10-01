const test = require('node:test');
const assert = require('node:assert');
const { warrantyStatus } = require('../src/lib/warranty');

const NOW = new Date(2026, 9, 1); // 2026-10-01

test('no warranty recorded', () => {
  assert.strictEqual(warrantyStatus(null, NOW), null);
  assert.strictEqual(warrantyStatus('', NOW), null);
});

test('active when far from expiry', () => {
  assert.deepStrictEqual(warrantyStatus('2027-10-01', NOW), { status: 'active', daysLeft: 365 });
});

test('expiring within 90 days, including the last covered day', () => {
  assert.strictEqual(warrantyStatus('2026-12-30', NOW).status, 'expiring');
  assert.deepStrictEqual(warrantyStatus('2026-10-01', NOW), { status: 'expiring', daysLeft: 0 });
  assert.strictEqual(warrantyStatus('2026-12-31', NOW).status, 'active');
});

test('expired after the expiry date', () => {
  assert.deepStrictEqual(warrantyStatus('2026-09-30', NOW), { status: 'expired', daysLeft: -1 });
});

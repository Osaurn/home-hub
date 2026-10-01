const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeTaskCheckpoints } = require('../src/lib/dueDateLogic');

// Fixed "today" used across quarterly tests: 2026-09-30 -> Q3.
const NOW = new Date(2026, 8, 30);

test('quarterly task is due when current quarter matches and no completion this year', () => {
  const task = { recurrence_type: 'quarterly', quarters: '[3]' };
  const [cp] = computeTaskCheckpoints(task, [], NOW);
  assert.equal(cp.status, 'due');
  assert.equal(cp.quarter, 3);
});

test('quarterly task is overdue once its quarter has passed uncompleted', () => {
  const task = { recurrence_type: 'quarterly', quarters: '[1]' };
  const [cp] = computeTaskCheckpoints(task, [], NOW);
  assert.equal(cp.status, 'overdue');
});

test('quarterly task is upcoming if its quarter has not arrived yet', () => {
  const task = { recurrence_type: 'quarterly', quarters: '[4]' };
  const [cp] = computeTaskCheckpoints(task, [], NOW);
  assert.equal(cp.status, 'upcoming');
});

test('quarterly task is satisfied by a completion in its quarter this year', () => {
  const task = { recurrence_type: 'quarterly', quarters: '[3]' };
  const completions = [{ completed_at: '2026-08-15' }];
  const [cp] = computeTaskCheckpoints(task, completions, NOW);
  assert.equal(cp.status, 'done');
});

test('quarterly completion does not carry over from a previous year', () => {
  const task = { recurrence_type: 'quarterly', quarters: '[3]' };
  const completions = [{ completed_at: '2025-08-15' }];
  const [cp] = computeTaskCheckpoints(task, completions, NOW);
  assert.equal(cp.status, 'due');
});

test('quarterly task with multiple checkpoints tracks each independently', () => {
  const task = { recurrence_type: 'quarterly', quarters: '[1,3]' };
  const completions = [{ completed_at: '2026-02-01' }]; // satisfies Q1 only
  const [q1, q3] = computeTaskCheckpoints(task, completions, NOW);
  assert.equal(q1.status, 'done');
  assert.equal(q3.status, 'due');
});

test('monthly task is due when current month matches and no completion this year', () => {
  const task = { recurrence_type: 'monthly', months: '[9]' };
  const [cp] = computeTaskCheckpoints(task, [], NOW);
  assert.equal(cp.status, 'due');
  assert.equal(cp.month, 9);
});

test('monthly task is overdue once its month has passed uncompleted', () => {
  const task = { recurrence_type: 'monthly', months: '[2]' };
  const [cp] = computeTaskCheckpoints(task, [], NOW);
  assert.equal(cp.status, 'overdue');
});

test('monthly task is upcoming if its month has not arrived yet', () => {
  const task = { recurrence_type: 'monthly', months: '[12]' };
  const [cp] = computeTaskCheckpoints(task, [], NOW);
  assert.equal(cp.status, 'upcoming');
});

test('monthly task is satisfied by a completion in its month this year', () => {
  const task = { recurrence_type: 'monthly', months: '[9]' };
  const completions = [{ completed_at: '2026-09-05' }];
  const [cp] = computeTaskCheckpoints(task, completions, NOW);
  assert.equal(cp.status, 'done');
});

test('monthly completion does not carry over from a previous year', () => {
  const task = { recurrence_type: 'monthly', months: '[9]' };
  const completions = [{ completed_at: '2025-09-05' }];
  const [cp] = computeTaskCheckpoints(task, completions, NOW);
  assert.equal(cp.status, 'due');
});

test('monthly task with multiple checkpoints tracks each independently', () => {
  const task = { recurrence_type: 'monthly', months: '[2,9]' };
  const completions = [{ completed_at: '2026-02-10' }]; // satisfies February only
  const [feb, sep] = computeTaskCheckpoints(task, completions, NOW);
  assert.equal(feb.status, 'done');
  assert.equal(sep.status, 'due');
});

test('interval task is upcoming inside the min-year window', () => {
  const task = { recurrence_type: 'interval', interval_min_years: 3, interval_max_years: 5 };
  const completions = [{ completed_at: '2025-01-01' }];
  const [cp] = computeTaskCheckpoints(task, completions, NOW);
  assert.equal(cp.status, 'upcoming');
});

test('interval task is due between min and max years', () => {
  const task = { recurrence_type: 'interval', interval_min_years: 3, interval_max_years: 5 };
  const completions = [{ completed_at: '2023-01-01' }];
  const [cp] = computeTaskCheckpoints(task, completions, NOW);
  assert.equal(cp.status, 'due');
});

test('interval task is overdue past the max-year window', () => {
  const task = { recurrence_type: 'interval', interval_min_years: 3, interval_max_years: 5 };
  const completions = [{ completed_at: '2019-01-01' }];
  const [cp] = computeTaskCheckpoints(task, completions, NOW);
  assert.equal(cp.status, 'overdue');
});

test('interval task never completed is immediately due', () => {
  const task = { recurrence_type: 'interval', interval_min_years: 3, interval_max_years: 5 };
  const [cp] = computeTaskCheckpoints(task, [], NOW);
  assert.equal(cp.status, 'due');
  assert.equal(cp.lastCompleted, null);
});

test('never-completed interval task with a future first-due date is upcoming', () => {
  const task = { recurrence_type: 'interval', interval_min_years: 3, interval_max_years: 5, interval_first_due: '2029-10-01' };
  const [cp] = computeTaskCheckpoints(task, [], NOW);
  assert.equal(cp.status, 'upcoming');
  assert.equal(cp.dueFrom, '2029-10-01');
  assert.equal(cp.overdueFrom, '2031-10-01');
});

test('never-completed interval task is due once its first-due date has passed', () => {
  const task = { recurrence_type: 'interval', interval_min_years: 3, interval_max_years: 5, interval_first_due: '2026-09-01' };
  const [cp] = computeTaskCheckpoints(task, [], NOW);
  assert.equal(cp.status, 'due');
});

test('first-due date is ignored once the task has a completion', () => {
  const task = { recurrence_type: 'interval', interval_min_years: 3, interval_max_years: 5, interval_first_due: '2029-10-01' };
  const [cp] = computeTaskCheckpoints(task, [{ completed_at: '2022-01-01' }], NOW);
  assert.equal(cp.status, 'due');
  assert.equal(cp.dueFrom, '2025-01-01');
});

// Pure functions for computing task due/overdue status. No I/O — `now` is
// always passed in so this stays trivial to unit test.

function getQuarter(date) {
  return Math.floor(date.getMonth() / 3) + 1;
}

function getMonthNumber(date) {
  return date.getMonth() + 1;
}

function parseISODate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addYears(date, years) {
  const d = new Date(date.getTime());
  d.setFullYear(d.getFullYear() + years);
  return d;
}

// One quarterly task can have several independent yearly checkpoints
// (e.g. quarters [1, 3] means it must be done once in Q1 and again in Q3).
// A completion satisfies the checkpoints for its own quarter and any
// earlier ones this year, but never carries over from a previous year.
function computeQuarterlyCheckpoints(task, completions, now) {
  const quarters = JSON.parse(task.quarters || '[]');
  const currentYear = now.getFullYear();
  const currentQuarter = getQuarter(now);
  const thisYearQuarters = completions
    .map((c) => parseISODate(c.completed_at))
    .filter((d) => d.getFullYear() === currentYear)
    .map((d) => getQuarter(d));

  return quarters.map((q) => {
    const satisfied = thisYearQuarters.some((cq) => cq >= q);
    let status;
    if (satisfied) status = 'done';
    else if (currentQuarter === q) status = 'due';
    else if (currentQuarter > q) status = 'overdue';
    else status = 'upcoming';
    return { type: 'quarterly', quarter: q, year: currentYear, status };
  });
}

// A monthly task pins the obligation to one or more exact calendar
// months (e.g. [2] means "every February") instead of a whole quarter.
// Same satisfied/overdue/upcoming rules as quarterly, just at month
// granularity, and likewise reset every January 1st.
function computeMonthlyCheckpoints(task, completions, now) {
  const months = JSON.parse(task.months || '[]');
  const currentYear = now.getFullYear();
  const currentMonth = getMonthNumber(now);
  const thisYearMonths = completions
    .map((c) => parseISODate(c.completed_at))
    .filter((d) => d.getFullYear() === currentYear)
    .map((d) => getMonthNumber(d));

  return months.map((m) => {
    const satisfied = thisYearMonths.some((cm) => cm >= m);
    let status;
    if (satisfied) status = 'done';
    else if (currentMonth === m) status = 'due';
    else if (currentMonth > m) status = 'overdue';
    else status = 'upcoming';
    return { type: 'monthly', month: m, year: currentYear, status };
  });
}

function computeIntervalStatus(task, completions, now) {
  if (completions.length === 0) {
    return {
      type: 'interval',
      status: 'due',
      lastCompleted: null,
      dueFrom: null,
      overdueFrom: null,
    };
  }

  const last = completions
    .map((c) => c.completed_at)
    .sort()
    .at(-1);
  const lastDate = parseISODate(last);
  const dueFrom = addYears(lastDate, task.interval_min_years);
  const overdueFrom = addYears(lastDate, task.interval_max_years);

  let status;
  if (now < dueFrom) status = 'upcoming';
  else if (now < overdueFrom) status = 'due';
  else status = 'overdue';

  return {
    type: 'interval',
    status,
    lastCompleted: last,
    dueFrom: toISODate(dueFrom),
    overdueFrom: toISODate(overdueFrom),
  };
}

// Returns an array of checkpoints for the task (quarterly/monthly tasks
// may have several; interval tasks always have exactly one), each with
// a `status` of 'due' | 'overdue' | 'upcoming' | 'done'.
function computeTaskCheckpoints(task, completions, now = new Date()) {
  if (task.recurrence_type === 'quarterly') {
    return computeQuarterlyCheckpoints(task, completions, now);
  }
  if (task.recurrence_type === 'monthly') {
    return computeMonthlyCheckpoints(task, completions, now);
  }
  return [computeIntervalStatus(task, completions, now)];
}

module.exports = {
  getQuarter,
  getMonthNumber,
  parseISODate,
  toISODate,
  addYears,
  computeTaskCheckpoints,
};

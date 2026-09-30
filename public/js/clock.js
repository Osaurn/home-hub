const QUARTER_COLORS = {
  done: '#3d6b52',
  due: '#c99a2e',
  overdue: '#b3392c',
  upcoming: '#d9d5c8',
};

const QUARTER_NAMES = { 1: 'Talvi', 2: 'Kevät', 3: 'Kesä', 4: 'Syksy' };

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function pieSlicePath(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 0 0 ${end.x} ${end.y} Z`;
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000) + 1;
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// quarterStatus: { 1: 'done'|'due'|'overdue'|'upcoming', ... }
function renderYearlyClock(container, { today, currentQuarter, quarterStatus, selectedQuarter, onQuarterClick }) {
  const cx = 100;
  const cy = 100;
  const r = 88;
  const daysInYear = isLeapYear(today.getFullYear()) ? 366 : 365;
  const todayAngle = (dayOfYear(today) / daysInYear) * 360;

  const slices = [1, 2, 3, 4]
    .map((q) => {
      const startAngle = (q - 1) * 90;
      const endAngle = q * 90;
      const status = quarterStatus[q] || 'upcoming';
      const midAngle = (startAngle + endAngle) / 2;
      const labelPos = polarToCartesian(cx, cy, r * 0.62, midAngle);
      const isCurrent = q === currentQuarter;
      const isSelected = q === selectedQuarter;
      return `
        <g class="quarter-slice" data-quarter="${q}" tabindex="0" role="button"
           aria-label="${QUARTER_NAMES[q]} — näytä tehtävät">
          <path d="${pieSlicePath(cx, cy, r, startAngle, endAngle)}"
                fill="${QUARTER_COLORS[status]}"
                stroke="${isSelected ? '#2b2b28' : '#fff'}" stroke-width="${isSelected ? 4 : 3}"
                opacity="${isCurrent ? 1 : 0.85}" />
          <text x="${labelPos.x}" y="${labelPos.y}" text-anchor="middle" dominant-baseline="middle"
                font-size="11" font-weight="${isCurrent ? '700' : '500'}" fill="#fff">
            ${QUARTER_NAMES[q]}
          </text>
        </g>`;
    })
    .join('');

  const marker = polarToCartesian(cx, cy, r, todayAngle);

  container.innerHTML = `
    <svg viewBox="0 0 200 200" role="img" aria-label="Vuosikello">
      ${slices}
      <circle cx="${cx}" cy="${cy}" r="34" fill="#fff" stroke="#e2ded4" stroke-width="2" />
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="12" fill="#6b6b63">Tänään</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="12" font-weight="700" fill="#2b2b28">${today.toLocaleDateString('fi-FI')}</text>
      <circle cx="${marker.x}" cy="${marker.y}" r="5" fill="#2b2b28" stroke="#fff" stroke-width="2" />
    </svg>`;

  if (onQuarterClick) {
    container.querySelectorAll('.quarter-slice').forEach((el) => {
      const q = Number(el.dataset.quarter);
      el.addEventListener('click', () => onQuarterClick(q));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onQuarterClick(q);
        }
      });
    });
  }
}

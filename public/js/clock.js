const QUARTER_COLORS = {
  done: '#1f8a82',
  due: '#f2b705',
  overdue: '#d7263d',
  upcoming: '#ffffff',
};
const INK = '#111111';
const QUARTER_TEXT = { done: '#fff', due: INK, overdue: '#fff', upcoming: INK };
const CLOCK_FONT = "'Nunito', 'Trebuchet MS', sans-serif";

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
                stroke="${INK}" stroke-width="${isSelected ? 5 : 3}" stroke-linejoin="round"
                opacity="${isCurrent ? 1 : 0.85}" />
          <text x="${labelPos.x}" y="${labelPos.y}" text-anchor="middle" dominant-baseline="middle"
                font-family="${CLOCK_FONT}" font-size="${isCurrent ? 14 : 12}" font-weight="900" fill="${QUARTER_TEXT[status]}">
            ${QUARTER_NAMES[q]}
          </text>
        </g>`;
    })
    .join('');

  const marker = polarToCartesian(cx, cy, r, todayAngle);

  container.innerHTML = `
    <svg viewBox="0 0 200 200" role="img" aria-label="Vuosikello">
      ${slices}
      <circle cx="${cx}" cy="${cy}" r="34" fill="#fbf6e9" stroke="${INK}" stroke-width="3" />
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="${CLOCK_FONT}" font-size="11" font-weight="800" fill="#555049">Tänään</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-family="${CLOCK_FONT}" font-size="12.5" font-weight="900" fill="${INK}">${today.toLocaleDateString('fi-FI')}</text>
      <circle cx="${marker.x}" cy="${marker.y}" r="7" fill="#d7263d" stroke="${INK}" stroke-width="3" />
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

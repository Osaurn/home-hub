const EXPIRING_SOON_DAYS = 90;

function toUTCDays(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// Warranty state for an ISO expiry date (YYYY-MM-DD, last covered day).
// Returns null when no warranty is recorded.
function warrantyStatus(expires, now = new Date()) {
  if (!expires) return null;
  const today = toUTCDays(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );
  const daysLeft = toUTCDays(expires) - today;
  const status = daysLeft < 0 ? 'expired' : daysLeft <= EXPIRING_SOON_DAYS ? 'expiring' : 'active';
  return { status, daysLeft };
}

module.exports = { warrantyStatus, EXPIRING_SOON_DAYS };

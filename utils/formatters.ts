export function fmtCurrency(val: number, decimals = 2): string {
  if (!isFinite(val)) return '$ —';
  return val.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPct(val: number, decimals = 2): string {
  if (!isFinite(val)) return '—%';
  return (val * 100).toFixed(decimals) + '%';
}

export function fmtNumber(val: number | string, decimals = 0): string {
  if (typeof val === 'string') return val;
  if (!isFinite(val)) return '—';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

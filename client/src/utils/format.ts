export function formatMoneyIN(amount: number): string {
  const n = Math.round(parseFloat(String(amount || 0)) * 100) / 100;
  const neg = n < 0;
  const abs = Math.abs(n);
  const parts = abs.toFixed(2).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '-' : ''}₹${intPart}.${parts[1]}`;
}

export function formatDateIN(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

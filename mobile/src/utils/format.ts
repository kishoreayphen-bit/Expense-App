export function formatCurrency(amount: number | string, currency: string = 'INR', locale?: string): string {
  const num = typeof amount === 'number' ? amount : Number(amount || 0) || 0;
  try {
    return new Intl.NumberFormat(locale || undefined, { style: 'currency', currency }).format(num);
  } catch {
    // Fallback if currency/locale not supported
    return `${num.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(amount: number | string, locale?: string): string {
  const num = typeof amount === 'number' ? amount : Number(amount || 0) || 0;
  try {
    return new Intl.NumberFormat(locale || undefined).format(num);
  } catch {
    return String(num);
  }
}

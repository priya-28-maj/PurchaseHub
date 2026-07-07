export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'AED', 'SGD', 'JPY'] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export function isValidCurrencyCode(code: string): code is CurrencyCode {
  return SUPPORTED_CURRENCIES.includes(code as CurrencyCode);
}

export function formatAmount(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const code = isValidCurrencyCode(currency) ? currency : DEFAULT_CURRENCY;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export function detectCurrencyFromText(text: string): CurrencyCode {
  if (/₹|Rs\.?\s*\d|INR/i.test(text)) return 'INR';
  if (/€|\bEUR\b/i.test(text)) return 'EUR';
  if (/£|\bGBP\b/i.test(text)) return 'GBP';
  if (/\bCAD\b|C\$/.test(text)) return 'CAD';
  if (/\bAUD\b|A\$/.test(text)) return 'AUD';
  if (/\bAED\b/.test(text)) return 'AED';
  if (/\bSGD\b|S\$/.test(text)) return 'SGD';
  if (/¥|\bJPY\b/i.test(text)) return 'JPY';
  if (/\$|\bUSD\b/i.test(text)) return 'USD';
  return DEFAULT_CURRENCY;
}

import { format, parseISO } from 'date-fns';
import { CurrencyCode, WarrantyStatus } from '../types';

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'AED' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
];

export function formatCurrency(amount: number, currency: CurrencyCode = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatMultiCurrency(totals: Array<{ currency: CurrencyCode; total: number }>): string {
  if (totals.length === 0) return formatCurrency(0);
  return totals.map(({ currency, total }) => formatCurrency(total, currency)).join(' · ');
}

export function getCurrencySymbol(currency: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === currency)?.symbol || currency;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d');
}

export const WARRANTY_LABELS: Record<WarrantyStatus, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  none: 'No Warranty',
};

export const WARRANTY_COLORS: Record<WarrantyStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  expiring_soon: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  expired: 'bg-red-50 text-red-700 ring-red-600/20',
  none: 'bg-slate-50 text-slate-600 ring-slate-500/20',
};

export const CATEGORIES = [
  'Electronics',
  'Appliances',
  'Furniture',
  'Clothing',
  'Automotive',
  'Sports & Outdoors',
  'Home & Garden',
  'Health & Beauty',
  'Other',
];

export function getRemainingDaysText(days: number | null | undefined): string {
  if (days === null || days === undefined) return '';
  if (days < 0) return 'Expired';
  if (days === 0) return 'Expires today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function parseOcrDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch {
    // fall through
  }
  return new Date().toISOString().split('T')[0];
}

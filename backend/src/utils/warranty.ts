import { WarrantyStatus } from '../models/Product';

export function calculateWarrantyExpiry(purchaseDate: Date, durationMonths: number): Date | null {
  if (durationMonths <= 0) return null;
  const expiry = new Date(purchaseDate);
  expiry.setMonth(expiry.getMonth() + durationMonths);
  return expiry;
}

export function getWarrantyStatus(expiry: Date | null): WarrantyStatus {
  if (!expiry) return 'none';

  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'expiring_soon';
  return 'active';
}

export function getRemainingDays(expiry: Date | null): number | null {
  if (!expiry) return null;
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

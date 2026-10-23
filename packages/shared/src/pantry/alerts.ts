import { PANTRY_EXPIRING_SOON_DAYS } from './constants';

export function isLowStock(quantity: number, minQuantity: number | null): boolean {
  return minQuantity != null && quantity <= minQuantity;
}

export function isExpiringSoon(expiresAt: Date | null, today: Date, windowDays = PANTRY_EXPIRING_SOON_DAYS): boolean {
  if (!expiresAt) return false;
  const limit = new Date(today);
  limit.setUTCDate(limit.getUTCDate() + windowDays);
  return expiresAt >= today && expiresAt <= limit;
}

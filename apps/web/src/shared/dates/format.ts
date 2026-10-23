import { DISPLAY_DATE_FORMAT, ISO_DATE_FORMAT } from './constants';
import { dayjs } from './dayjs';

/** Date from picker → YYYY-MM-DD string (local calendar, no UTC shift). */
export function formatDateToIsoDateString(date: Date): string {
  return dayjs(date).format(ISO_DATE_FORMAT);
}

/** Date from picker → ISO datetime at UTC midnight (API fields like birthDate). */
export function formatDateToIsoDateTime(date: Date): string {
  return `${formatDateToIsoDateString(date)}T00:00:00.000Z`;
}

/** YYYY-MM-DD string from API → DD/MM/YYYY for display. */
export function formatIsoDateStringForDisplay(isoDate: string): string {
  return dayjs(isoDate, ISO_DATE_FORMAT, true).format(DISPLAY_DATE_FORMAT);
}

/** ISO datetime or YYYY-MM-DD from API → Date for DatePicker (local calendar). */
export function parseIsoDateStringToDate(value: string): Date {
  const dateKey = extractIsoDateKey(value);
  if (!dateKey) {
    return new Date(value);
  }
  return dayjs(dateKey, ISO_DATE_FORMAT, true).toDate();
}

/** Normalize API string or Date to YYYY-MM-DD for calendar-day comparison. */
export function extractIsoDateKey(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return formatDateToIsoDateString(value);

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match?.[1]) return match[1];

  const parsed = dayjs(value, ISO_DATE_FORMAT, true);
  return parsed.isValid() ? parsed.format(ISO_DATE_FORMAT) : null;
}

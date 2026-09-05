/**
 * Robust Local Date & Time Utilities
 * Avoids timezone drift caused by Date.toISOString() in non-UTC timezones (e.g. Asia/Dhaka GMT+6).
 */

/**
 * Returns YYYY-MM-DD representing the current local date (or for a given Date).
 * Safely uses local timezone getters (getFullYear, getMonth, getDate).
 */
export const getLocalDateString = (input?: Date | string | number): string => {
  let d: Date;
  if (!input) {
    d = new Date();
  } else if (typeof input === 'string') {
    if (input.length === 10 && input.includes('-')) {
      return input;
    }
    d = new Date(input);
  } else {
    d = new Date(input);
  }

  if (isNaN(d.getTime())) {
    d = new Date();
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns YYYY-MM-01 for the first day of the current (or given) month in local time.
 */
export const getLocalFirstDayOfMonth = (input?: Date): string => {
  const d = input || new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

/**
 * Extracts YYYY-MM-DD from any date string or ISO timestamp safely.
 */
export const normalizeDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  if (dateStr.includes(' ')) {
    return dateStr.split(' ')[0];
  }
  return dateStr;
};

/**
 * Formats a YYYY-MM-DD date into a readable Bangla or English date.
 * Example: 'শনিবার, ৫ সেপ্টেম্বর ২০২৬' or '05 Sep 2026'
 */
export const formatDisplayDate = (dateStr?: string | null, includeDayName = true): string => {
  if (!dateStr) return '';
  const cleanStr = normalizeDate(dateStr);
  const parts = cleanStr.split('-');
  if (parts.length !== 3) return dateStr;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const d = new Date(year, month, day);
  if (isNaN(d.getTime())) return dateStr;

  try {
    return d.toLocaleDateString('bn-BD', {
      weekday: includeDayName ? 'long' : undefined,
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return d.toLocaleDateString('en-GB', {
      weekday: includeDayName ? 'short' : undefined,
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};

/**
 * Formats a Date object into a readable time string (e.g., '10:30 AM')
 */
export const formatDisplayTime = (date?: Date): string => {
  const d = date || new Date();
  return d.toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

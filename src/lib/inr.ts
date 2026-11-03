/**
 * Formats a number using Indian number system (lakhs, crores).
 * Amounts stored in paise (integer), displayed in rupees.
 */
export function formatINR(paise: number, compact = false): string {
  const rupees = paise / 100;

  if (compact) {
    if (rupees >= 1_00_00_000) {
      return `₹${(rupees / 1_00_00_000).toFixed(2)} Cr`;
    }
    if (rupees >= 1_00_000) {
      return `₹${(rupees / 1_00_000).toFixed(2)} L`;
    }
    if (rupees >= 1_000) {
      return `₹${(rupees / 1_000).toFixed(1)}K`;
    }
    return `₹${rupees.toFixed(0)}`;
  }

  return rupees.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** Converts rupees input string to paise integer */
export function rupeesToPaise(rupees: number | string): number {
  return Math.round(Number(rupees) * 100);
}

/** Converts paise to rupees */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Current month as YYYY-MM */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** First and last day of a YYYY-MM month as YYYY-MM-DD strings */
export function monthRange(yyyyMM: string): { start: string; end: string } {
  const [year, month] = yyyyMM.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${yyyyMM}-01`,
    end: `${yyyyMM}-${String(lastDay).padStart(2, '0')}`,
  };
}

/** Month display label */
export function monthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

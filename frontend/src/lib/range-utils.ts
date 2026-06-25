// src/lib/range-utils.ts
// Extracted from dashboard/page.tsx — Next.js doesn't allow arbitrary named exports from page files

export type DateRange = {
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
  months: number;
};

export function rangeFromMonths(months: number): DateRange {
  const FROM_YEAR = 2026; const FROM_MONTH = 7;
  const MAX_YEAR  = 2028; const MAX_MONTH  = 12;
  const clamped = Math.max(1, Math.min(months, 30));
  let toMonth = FROM_MONTH + clamped - 1;
  let toYear  = FROM_YEAR;
  while (toMonth > 12) { toMonth -= 12; toYear++; }
  if (toYear > MAX_YEAR || (toYear === MAX_YEAR && toMonth > MAX_MONTH)) {
    toYear = MAX_YEAR; toMonth = MAX_MONTH;
  }
  return { fromYear: FROM_YEAR, fromMonth: FROM_MONTH, toYear, toMonth, months: clamped };
}
"use client";
import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import {
  StatCards,
  RevenueChart,
  SalespersonTable,
  UpcomingRenewals,
  PipelineDonut,
} from "@/components/dashboard";

export type DateRange = {
  fromYear: number; fromMonth: number;
  toYear: number;   toMonth: number;
  months: number; // how many months from Jul 2026
};

// Compute a DateRange from a month count starting Jul 2026
export function rangeFromMonths(months: number): DateRange {
  const FROM_YEAR = 2026; const FROM_MONTH = 7;
  const MAX_YEAR  = 2028; const MAX_MONTH  = 12;
  // clamp to data range
  const clamped = Math.max(1, Math.min(months, 30));
  let toMonth = FROM_MONTH + clamped - 1;
  let toYear  = FROM_YEAR;
  while (toMonth > 12) { toMonth -= 12; toYear++; }
  // don't exceed Dec 2028
  if (toYear > MAX_YEAR || (toYear === MAX_YEAR && toMonth > MAX_MONTH)) {
    toYear = MAX_YEAR; toMonth = MAX_MONTH;
  }
  return { fromYear: FROM_YEAR, fromMonth: FROM_MONTH, toYear, toMonth, months: clamped };
}

export default function DashboardPage() {
  const [months, setMonths] = useState<number>(30); // default: full range
  const range = rangeFromMonths(months);

  return (
    <PageWrapper>
      <div className="flex flex-col gap-5">
        <StatCards range={range} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <RevenueChart range={range} months={months} onMonthsChange={setMonths} />
          <PipelineDonut range={range} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2"><SalespersonTable /></div>
          <UpcomingRenewals />
        </div>
      </div>
    </PageWrapper>
  );
}
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
import { rangeFromMonths } from "@/lib/range-utils";

export default function DashboardPage() {
  const [months, setMonths] = useState<number>(30);
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
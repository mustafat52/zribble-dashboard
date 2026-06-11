import { PageWrapper } from "@/components/layout/PageWrapper";
import {
  StatCards,
  RevenueChart,
  SalespersonTable,
  UpcomingRenewals,
  PipelineDonut,
} from "@/components/dashboard";

export default function DashboardPage() {
  return (
    <PageWrapper>
      <div className="flex flex-col gap-5">
        {/* Row 1: KPI cards */}
        <StatCards />

        {/* Row 2: Revenue chart (2/3) + Donut (1/3) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <RevenueChart />
          <PipelineDonut />
        </div>

        {/* Row 3: Salesperson table (2/3) + Upcoming renewals (1/3) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <SalespersonTable />
          </div>
          <UpcomingRenewals />
        </div>
      </div>
    </PageWrapper>
  );
}

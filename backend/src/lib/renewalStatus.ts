import { prisma } from "./prisma";

// ── recalcRenewalStatus ─────────────────────────────────────────────────────
// Single source of truth for what RenewalMonth.status should be, derived
// from real Payment rows (never trusted from the client directly).
//
// Called from:
//   - payments.ts   POST /payments   (after recording/deleting a payment)
//   - payments.ts   DELETE /payments/:id
//   - promises.ts   POST /promises   (after creating a promise)
//   - promises.ts   DELETE /promises/:id (after deleting one)
//
// Previously only payments.ts called this, so creating/deleting a promise
// never touched status at all — a renewal with ₹0 collected and a full
// promised balance stayed "pending" indefinitely, which read to users as
// "renewal hasn't happened" rather than "renewed, payment promised."
export async function recalcRenewalStatus(contractId: string, year: number, month: number) {
  const renewalMonthRow = await prisma.renewalMonth.findUnique({
    where: { contractId_year_month: { contractId, year, month } },
  });

  if (!renewalMonthRow) return;

  // Skip if manually set to overdue or waived — those are intentional overrides
  if (renewalMonthRow.status === "overdue" || renewalMonthRow.status === "waived") return;

  const allPayments = await prisma.payment.aggregate({
    where: { contractId, renewalYear: year, renewalMonth: month, type: "renewal" },
    _sum: { amount: true },
  });

  const totalPaid = allPayments._sum.amount ?? 0;
  const due = renewalMonthRow.overriddenAmount ?? renewalMonthRow.amount;

  let newStatus: "pending" | "partial" | "collected" | "promised";
  if (totalPaid <= 0) {
    // Nothing collected yet — check whether there's an active promise
    // against this specific renewal. If so, this is "renewed, payment
    // promised for later" rather than plain "pending" (no action at all).
    const activePromise = await prisma.promise.findFirst({
      where: { contractId, renewalYear: year, renewalMonth: month },
    });
    newStatus = activePromise ? "promised" : "pending";
  } else if (totalPaid >= due) {
    newStatus = "collected";
  } else {
    newStatus = "partial";
  }

  await prisma.renewalMonth.update({
    where: { contractId_year_month: { contractId, year, month } },
    data: { status: newStatus },
  });
}
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canWrite } from "../middleware/role";

const router = Router();
router.use(authenticate);

// ── GET /renewals?year=&month=&salesperson= ───────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { year, month, salesperson, accountManager } = req.query;

    // Build RenewalMonth filter
    const renewalWhere: Record<string, unknown> = {};
    if (year) renewalWhere.year = parseInt(year as string);
    if (month) renewalWhere.month = parseInt(month as string);

    // Build Contract filter for salesperson / account manager scoping
    const contractWhere: Record<string, unknown> = {};
    if (user.role === "employee" && user.salesperson) {
      contractWhere.salesperson = user.salesperson;
    } else if (user.role === "account_manager" && user.accountManager) {
      contractWhere.accountManager = user.accountManager;
    } else {
      if (salesperson) contractWhere.salesperson = salesperson as string;
      if (accountManager) contractWhere.accountManager = accountManager as string;
    }

    const renewals = await prisma.renewalMonth.findMany({
      where: {
        ...renewalWhere,
        contract: contractWhere,
      },
      include: {
        contract: {
          select: {
            id: true,
            clientName: true,
            salesperson: true,
            accountManager: true,
            product: true,
            contractStatus: true,
            payments: {
              where: year && month
                ? {
                    renewalYear: parseInt(year as string),
                    renewalMonth: parseInt(month as string),
                  }
                : {},
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    res.json(renewals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch renewals" });
  }
});

// ── GET /renewals/summary?salesperson= ───────────────────────────────────────
// Returns per-month aggregated totals for the payment history view.
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { salesperson, accountManager } = req.query;

    const contractWhere: Record<string, unknown> = {};
    if (user.role === "employee" && user.salesperson) {
      contractWhere.salesperson = user.salesperson;
    } else if (user.role === "account_manager" && user.accountManager) {
      contractWhere.accountManager = user.accountManager;
    } else {
      if (salesperson) contractWhere.salesperson = salesperson as string;
      if (accountManager) contractWhere.accountManager = accountManager as string;
    }

    // Group RenewalMonth rows by year+month, summing amounts and splitting by status
    const groups = await prisma.renewalMonth.groupBy({
      by: ["year", "month", "status"],
      where: { contract: contractWhere },
      _sum: { amount: true, overriddenAmount: true },
      _count: { id: true },
    });

    // Also total payments collected per year+month
    const paymentGroups = await prisma.payment.groupBy({
      by: ["renewalYear", "renewalMonth"],
      where: { type: "renewal", contract: contractWhere },
      _sum: { amount: true },
    });

    const paymentMap = new Map<string, number>();
    for (const pg of paymentGroups) {
      paymentMap.set(`${pg.renewalYear}-${pg.renewalMonth}`, pg._sum.amount ?? 0);
    }

    // Merge into a month-keyed structure
    const monthMap = new Map<string, {
      year: number; month: number;
      expected: number; collected: number;
      pending: number; partial: number; overdue: number; waived: number;
    }>();

    for (const g of groups) {
      const key = `${g.year}-${g.month}`;
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          year: g.year, month: g.month,
          expected: 0, collected: 0,
          pending: 0, partial: 0, overdue: 0, waived: 0,
        });
      }
      const entry = monthMap.get(key)!;
      const amount = g._sum.overriddenAmount ?? g._sum.amount ?? 0;
      entry.expected += amount;
      (entry as Record<string, unknown>)[g.status] =
        ((entry as Record<string, unknown>)[g.status] as number) + amount;
    }

    // Attach actual collected amount from Payment table
    for (const [key, entry] of monthMap) {
      entry.collected = paymentMap.get(key) ?? 0;
    }

    const summary = Array.from(monthMap.values()).sort(
      (a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month
    );

    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch renewal summary" });
  }
});

// ── PATCH /renewals/:contractId/:year/:month/status ───────────────────────────
// Manually override a renewal month's status (overdue / waived / reset to pending).
// Only super_admin and accounts_team can do this (or view_edit employees for their own).
router.patch(
  "/:contractId/:year/:month/status",
  canWrite,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { contractId, year, month } = req.params;
      const { status } = req.body as {
        status: "pending" | "partial" | "collected" | "overdue" | "waived";
      };

      const validStatuses = ["pending", "partial", "collected", "overdue", "waived"];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
        return;
      }

      const contract = await prisma.contract.findUnique({ where: { id: contractId } });
      if (!contract) {
        res.status(404).json({ error: "Contract not found" });
        return;
      }

      if (user.role === "employee" && contract.salesperson !== user.salesperson) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (user.role === "account_manager" && contract.accountManager !== user.accountManager) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const renewalMonth = await prisma.renewalMonth.findUnique({
        where: {
          contractId_year_month: {
            contractId,
            year: parseInt(year),
            month: parseInt(month),
          },
        },
      });

      if (!renewalMonth) {
        res.status(404).json({ error: "Renewal month not found" });
        return;
      }

      const updated = await prisma.renewalMonth.update({
        where: {
          contractId_year_month: {
            contractId,
            year: parseInt(year),
            month: parseInt(month),
          },
        },
        data: { status },
      });

      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update renewal status" });
    }
  }
);

// ── Shared: calculate a renewal's fallback due date when no manual
// actualDueDate override exists. MUST stay identical to the equivalent
// logic in frontend/src/components/renewals/RenewalTable.tsx and
// RenewalCalendar.tsx (calculatedDueDate/effectiveDueDate) — this is the
// backend's authoritative version, used only for computing cascade shifts.
function calculatedDueDate(firstRenewalDate: string, contractId: string, year: number, month: number): Date {
  const firstDate = new Date(firstRenewalDate);
  let day = firstDate.getDate();
  if (firstDate.getFullYear() !== year || firstDate.getMonth() + 1 !== month) {
    day = (parseInt(contractId.replace(/\D/g, "").slice(-4) || "1") % 28) + 1;
  }
  return new Date(year, month - 1, day);
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  // Normalize to midnight so partial-day timestamp noise doesn't throw off
  // the day count.
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((bMid.getTime() - aMid.getTime()) / MS_PER_DAY);
}

// ── PATCH /renewals/:contractId/:year/:month/date ─────────────────────────────
// Manually correct a single renewal's actual due date (e.g. a 2-3 day
// extension, or a shift into a different month/year).
//
// By default this ONLY updates the `actualDueDate` field on this one
// RenewalMonth row — no other renewal is touched, and `year`/`month` (the
// original schedule slot used for grouping, summaries, and payment-matching)
// are left as-is. Pass `date: null` to clear the override and revert to the
// calculated date.
//
// If `cascade: true` is also passed, every LATER renewal on this contract
// shifts by the same number of days as this edit — e.g. if this renewal
// moved 3 days later, every future renewal moves 3 days later too, because
// the underlying billing cycle itself shifted, not just one payment.
// Renewals that already have their OWN manual actualDueDate are skipped —
// someone corrected that one for a specific reason, so a blanket cascade
// won't silently overwrite it. The response lists which renewals were
// updated and which were skipped, so nothing changes invisibly.
router.patch(
  "/:contractId/:year/:month/date",
  canWrite,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const { contractId, year, month } = req.params;
      const { date, cascade } = req.body as { date: string | null; cascade?: boolean };

      if (date !== null && date !== undefined && isNaN(Date.parse(date))) {
        res.status(400).json({ error: "Invalid date" });
        return;
      }

      const contract = await prisma.contract.findUnique({ where: { id: contractId } });
      if (!contract) {
        res.status(404).json({ error: "Contract not found" });
        return;
      }

      if (user.role === "employee" && contract.salesperson !== user.salesperson) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      if (user.role === "account_manager" && contract.accountManager !== user.accountManager) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const yearNum  = parseInt(year);
      const monthNum = parseInt(month);

      const renewalMonth = await prisma.renewalMonth.findUnique({
        where: { contractId_year_month: { contractId, year: yearNum, month: monthNum } },
      });

      if (!renewalMonth) {
        res.status(404).json({ error: "Renewal month not found" });
        return;
      }

      // Clearing an override (date: null) never cascades — there's no
      // "shift" to propagate, it's just reverting this one row.
      if (!date || !cascade) {
        const updated = await prisma.renewalMonth.update({
          where: { contractId_year_month: { contractId, year: yearNum, month: monthNum } },
          data: { actualDueDate: date ? new Date(date) : null },
        });
        res.json({ updated, cascaded: null });
        return;
      }

      // ── Cascading path ──────────────────────────────────────────────────
      const previousEffective = renewalMonth.actualDueDate
        ?? calculatedDueDate(contract.firstRenewalDate, contractId, yearNum, monthNum);
      const newEffective = new Date(date);
      const shiftDays = daysBetween(previousEffective, newEffective);

      const futureRows = await prisma.renewalMonth.findMany({
        where: {
          contractId,
          OR: [
            { year: { gt: yearNum } },
            { year: yearNum, month: { gt: monthNum } },
          ],
        },
      });

      const skipped: { year: number; month: number }[] = [];
      const toUpdate: { year: number; month: number; newDate: Date }[] = [];

      for (const row of futureRows) {
        if (row.actualDueDate) {
          // Already has its own manual correction — leave it alone.
          skipped.push({ year: row.year, month: row.month });
          continue;
        }
        if (shiftDays === 0) continue; // nothing to shift
        const rowCalculated = calculatedDueDate(contract.firstRenewalDate, contractId, row.year, row.month);
        const rowShifted = new Date(rowCalculated);
        rowShifted.setDate(rowShifted.getDate() + shiftDays);
        toUpdate.push({ year: row.year, month: row.month, newDate: rowShifted });
      }

      const [updated] = await prisma.$transaction([
        prisma.renewalMonth.update({
          where: { contractId_year_month: { contractId, year: yearNum, month: monthNum } },
          data: { actualDueDate: newEffective },
        }),
        ...toUpdate.map((r) =>
          prisma.renewalMonth.update({
            where: { contractId_year_month: { contractId, year: r.year, month: r.month } },
            data: { actualDueDate: r.newDate },
          })
        ),
      ]);

      res.json({
        updated,
        cascaded: {
          shiftDays,
          updatedCount: toUpdate.length,
          skipped,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update renewal date" });
    }
  }
);

export default router;
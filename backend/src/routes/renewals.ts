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
    const { year, month, salesperson } = req.query;

    // Build RenewalMonth filter
    const renewalWhere: Record<string, unknown> = {};
    if (year) renewalWhere.year = parseInt(year as string);
    if (month) renewalWhere.month = parseInt(month as string);

    // Build Contract filter for salesperson scoping
    const contractWhere: Record<string, unknown> = {};
    if (user.role === "employee" && user.salesperson) {
      contractWhere.salesperson = user.salesperson;
    } else if (salesperson) {
      contractWhere.salesperson = salesperson as string;
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
    const { salesperson } = req.query;

    const contractWhere: Record<string, unknown> = {};
    if (user.role === "employee" && user.salesperson) {
      contractWhere.salesperson = user.salesperson;
    } else if (salesperson) {
      contractWhere.salesperson = salesperson as string;
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

export default router;
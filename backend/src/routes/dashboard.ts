import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// ── GET /dashboard/stats ──────────────────────────────────────────────────────
// Returns aggregated KPIs. Employees see only their own pipeline.
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    // Scope filter for employee
    const salespersonFilter =
      user.role === "employee" && user.salesperson
        ? { salesperson: user.salesperson }
        : {};

    // ── Contracts ──────────────────────────────────────────────────────────
    const [totalContracts, activeContracts, stoppedContracts] = await Promise.all([
      prisma.contract.count({ where: salespersonFilter }),
      prisma.contract.count({ where: { ...salespersonFilter, contractStatus: "active" } }),
      prisma.contract.count({ where: { ...salespersonFilter, contractStatus: "stopped" } }),
    ]);

    // ── Deal value ─────────────────────────────────────────────────────────
    const dealValueAgg = await prisma.contract.aggregate({
      where: { ...salespersonFilter, contractStatus: "active" },
      _sum: { dealValue: true },
    });
    const totalDealValue = dealValueAgg._sum.dealValue ?? 0;

    // ── Renewal months by status ───────────────────────────────────────────
    const renewalStatusGroups = await prisma.renewalMonth.groupBy({
      by: ["status"],
      where: { contract: salespersonFilter },
      _count: { status: true },
      _sum: { amount: true },
    });

    const byStatus: Record<string, { count: number; amount: number }> = {};
    for (const g of renewalStatusGroups) {
      byStatus[g.status] = {
        count: g._count.status,
        amount: g._sum.amount ?? 0,
      };
    }

    // ── Total collected (sum of all payments) ──────────────────────────────
    const paymentsAgg = await prisma.payment.aggregate({
      where: { contract: salespersonFilter, type: "renewal" },
      _sum: { amount: true },
    });
    const totalCollected = paymentsAgg._sum.amount ?? 0;

    // ── Upcoming renewals (next 3 months from today) ───────────────────────
    const now = new Date();
    const upcoming = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      upcoming.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }

    const upcomingRenewals = await prisma.renewalMonth.findMany({
      where: {
        contract: { ...salespersonFilter, contractStatus: "active" },
        status: { in: ["pending", "partial"] },
        OR: upcoming.map((u) => ({ year: u.year, month: u.month })),
      },
      include: {
        contract: {
          select: {
            id: true,
            clientName: true,
            salesperson: true,
            product: true,
          },
        },
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
      take: 20,
    });

    // ── Per-salesperson breakdown (admin/accounts only) ────────────────────
    let salesBreakdown = null;
    if (user.role !== "employee") {
      const salesGroups = await prisma.contract.groupBy({
        by: ["salesperson"],
        where: { contractStatus: "active" },
        _count: { id: true },
        _sum: { dealValue: true },
      });
      salesBreakdown = salesGroups.map((g) => ({
        salesperson: g.salesperson,
        activeContracts: g._count.id,
        totalDealValue: g._sum.dealValue ?? 0,
      }));
    }

    res.json({
      totalContracts,
      activeContracts,
      stoppedContracts,
      totalDealValue,
      totalCollected,
      renewalsByStatus: byStatus,
      upcomingRenewals,
      salesBreakdown,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

export default router;
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// ── GET /dashboard/stats ──────────────────────────────────────────────────────
// Returns aggregated KPIs. Employees and account managers see only their own pipeline.
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    // Scope filter for employee / account_manager
    const scopeFilter =
      user.role === "employee" && user.salesperson
        ? { salesperson: user.salesperson }
        : user.role === "account_manager" && user.accountManager
        ? { accountManager: user.accountManager }
        : {};

    // ── Contracts ──────────────────────────────────────────────────────────
    const [totalContracts, activeContracts, stoppedContracts] = await Promise.all([
      prisma.contract.count({ where: scopeFilter }),
      prisma.contract.count({ where: { ...scopeFilter, contractStatus: "active" } }),
      prisma.contract.count({ where: { ...scopeFilter, contractStatus: "stopped" } }),
    ]);

    // ── Deal value ─────────────────────────────────────────────────────────
    const dealValueAgg = await prisma.contract.aggregate({
      where: { ...scopeFilter, contractStatus: "active" },
      _sum: { dealValue: true },
    });
    const totalDealValue = dealValueAgg._sum.dealValue ?? 0;

    // ── Renewal months by status ───────────────────────────────────────────
    const renewalStatusGroups = await prisma.renewalMonth.groupBy({
      by: ["status"],
      where: { contract: scopeFilter },
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
      where: { contract: scopeFilter, type: "renewal" },
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
        contract: { ...scopeFilter, contractStatus: "active" },
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
    if (user.role === "super_admin" || user.role === "accounts_team") {
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

    // ── Per-exec breakdown (account_manager only) ───────────────────────────
    // Shows an AM which execs' clients make up their own portfolio, e.g.
    // "of my 40 clients, 15 belong to Aftab, 10 to Sarvesh..."
    let execBreakdown = null;
    if (user.role === "account_manager") {
      const execGroups = await prisma.contract.groupBy({
        by: ["salesperson"],
        where: { ...scopeFilter, contractStatus: "active" },
        _count: { id: true },
        _sum: { dealValue: true },
      });
      execBreakdown = execGroups.map((g) => ({
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
      execBreakdown,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

export default router;
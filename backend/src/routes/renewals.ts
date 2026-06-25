import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";

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

export default router;
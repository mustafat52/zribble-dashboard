import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canWrite } from "../middleware/role";

const router = Router();
router.use(authenticate);

// ── POST /price-overrides ─────────────────────────────────────────────────────
// Creates a price override record and updates all RenewalMonth rows from
// the given year/month onwards for that contract.
router.post("/", canWrite, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { contractId, fromYear, fromMonth, newAmount } = req.body as {
      contractId: string;
      fromYear: number;
      fromMonth: number;
      newAmount: number;
    };

    if (!contractId || !fromYear || !fromMonth || newAmount === undefined) {
      res.status(400).json({ error: "contractId, fromYear, fromMonth, and newAmount are required" });
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

    // Find all RenewalMonth rows >= fromYear/fromMonth for this contract
    const renewalMonthsToUpdate = await prisma.renewalMonth.findMany({
      where: {
        contractId,
        OR: [
          { year: { gt: Number(fromYear) } },
          { year: Number(fromYear), month: { gte: Number(fromMonth) } },
        ],
      },
    });

    // Run as a transaction: save the override record + update affected months
    const [override] = await prisma.$transaction([
      prisma.priceOverride.create({
        data: {
          contractId,
          fromYear: Number(fromYear),
          fromMonth: Number(fromMonth),
          newAmount: Number(newAmount),
        },
      }),
      ...renewalMonthsToUpdate.map((rm) =>
        prisma.renewalMonth.update({
          where: { id: rm.id },
          data: { overriddenAmount: Number(newAmount) },
        })
      ),
    ]);

    res.status(201).json({
      override,
      updatedMonths: renewalMonthsToUpdate.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to apply price override" });
  }
});

export default router;
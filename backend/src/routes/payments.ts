import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canWrite } from "../middleware/role";

const router = Router();
router.use(authenticate);

// ── POST /payments ────────────────────────────────────────────────────────────
// Records a payment and recalculates the RenewalMonth status automatically.
router.post("/", canWrite, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const {
      contractId, renewalYear, renewalMonth,
      amount, paidOn, notes, type,
    } = req.body as {
      contractId: string;
      renewalYear: number;
      renewalMonth: number;
      amount: number;
      paidOn: string;
      notes?: string;
      type?: "renewal" | "onboarding";
    };

    if (!contractId || !renewalYear || !renewalMonth || !amount || !paidOn) {
      res.status(400).json({ error: "contractId, renewalYear, renewalMonth, amount, and paidOn are required" });
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

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        contractId,
        renewalYear: Number(renewalYear),
        renewalMonth: Number(renewalMonth),
        amount: Number(amount),
        paidOn,
        notes: notes ?? null,
        recordedBy: user.userId,
        type: type ?? "renewal",
      },
    });

    // Recalculate RenewalMonth status if it's a renewal payment
    if (!type || type === "renewal") {
      const renewalMonthRow = await prisma.renewalMonth.findUnique({
        where: {
          contractId_year_month: {
            contractId,
            year: Number(renewalYear),
            month: Number(renewalMonth),
          },
        },
      });

      if (renewalMonthRow) {
        // Sum all payments for this renewal slot
        const allPayments = await prisma.payment.aggregate({
          where: {
            contractId,
            renewalYear: Number(renewalYear),
            renewalMonth: Number(renewalMonth),
            type: "renewal",
          },
          _sum: { amount: true },
        });

        const totalPaid = allPayments._sum.amount ?? 0;
        const due = renewalMonthRow.overriddenAmount ?? renewalMonthRow.amount;

        let newStatus: "pending" | "partial" | "collected" | "overdue" | "waived";
        if (totalPaid <= 0) {
          newStatus = "pending";
        } else if (totalPaid >= due) {
          newStatus = "collected";
        } else {
          newStatus = "partial";
        }

        await prisma.renewalMonth.update({
          where: {
            contractId_year_month: {
              contractId,
              year: Number(renewalYear),
              month: Number(renewalMonth),
            },
          },
          data: { status: newStatus },
        });
      }
    }

    res.status(201).json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

export default router;
import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canWrite } from "../middleware/role";
import { recalcRenewalStatus } from "../lib/renewalStatus";

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

    // BUG FIX: this used to check `!amount`, which is true for 0 — so a
    // legitimate "₹0 collected now, rest fully promised for later" payment
    // (amount: 0) was silently rejected with a 400 here. Because the request
    // failed, no Payment row was ever created, so recalcRenewalStatus()
    // never ran, and RenewalMonth.status stayed stuck on "pending" even
    // though a promise had been correctly saved for the full balance.
    // amount === 0 is a valid, meaningful value and must be allowed through;
    // only missing/negative amounts are actually invalid.
    if (!contractId || !renewalYear || !renewalMonth || amount === undefined || amount === null || !paidOn) {
      res.status(400).json({ error: "contractId, renewalYear, renewalMonth, amount, and paidOn are required" });
      return;
    }
    if (amount < 0) {
      res.status(400).json({ error: "amount cannot be negative" });
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

    
    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        contractId,
        renewalYear: Number(renewalYear),
        renewalMonth: Number(renewalMonth),
        amount: Number(amount),
        paidOn,
        notes: notes ?? null,
        recordedBy: dbUser?.name ?? "Unknown",
        type: type ?? "renewal",
      },
    });
    // Recalculate RenewalMonth status if it's a renewal payment
    if (!type || type === "renewal") {
      await recalcRenewalStatus(contractId, Number(renewalYear), Number(renewalMonth));
    }

    res.status(201).json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record payment" });
  }
});

// ── DELETE /payments/:id ──────────────────────────────────────────────────────
// Removes an erroneous payment and recalculates the RenewalMonth status.
router.delete("/:id", canWrite, async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }

    // Check ownership through the contract
    const contract = await prisma.contract.findUnique({ where: { id: payment.contractId } });
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

    await prisma.payment.delete({ where: { id: req.params.id } });

    // Recalculate status after deletion (only for renewal type payments)
    if (payment.type === "renewal") {
      await recalcRenewalStatus(payment.contractId, payment.renewalYear, payment.renewalMonth);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete payment" });
  }
});

export default router;
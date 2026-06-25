import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canWrite } from "../middleware/role";

const router = Router();
router.use(authenticate);

// ── POST /promises ────────────────────────────────────────────────────────────
router.post("/", canWrite, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const {
      contractId, clientName, salesperson,
      renewalYear, renewalMonth,
      paidAmount, remainingAmount, promisedDate, notes,
    } = req.body;

    if (!contractId || !renewalYear || !renewalMonth || !promisedDate) {
      res.status(400).json({ error: "contractId, renewalYear, renewalMonth, and promisedDate are required" });
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

    const promise = await prisma.promise.create({
      data: {
        contractId,
        clientName: clientName ?? contract.clientName,
        salesperson: salesperson ?? contract.salesperson,
        renewalYear: Number(renewalYear),
        renewalMonth: Number(renewalMonth),
        paidAmount: Number(paidAmount ?? 0),
        remainingAmount: Number(remainingAmount ?? 0),
        promisedDate,
        notes: notes ?? null,
      },
    });

    res.status(201).json(promise);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create promise" });
  }
});

export default router;
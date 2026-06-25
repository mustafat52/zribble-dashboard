import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canWrite } from "../middleware/role";

const router = Router();
router.use(authenticate);

// ── GET /onboarding/:clientName ───────────────────────────────────────────────
router.get("/:clientName", async (req: Request, res: Response) => {
  try {
    const onboarding = await prisma.onboardingPayment.findFirst({
      where: { clientName: decodeURIComponent(req.params.clientName) },
    });

    if (!onboarding) {
      res.status(404).json({ error: "Onboarding payment not found" });
      return;
    }

    res.json(onboarding);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch onboarding payment" });
  }
});

// ── POST /onboarding ──────────────────────────────────────────────────────────
// Upserts — only one onboarding record per contract
router.post("/", canWrite, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const {
      contractId, clientName, salesperson,
      status, amountCollected, paidOn, notes,
    } = req.body;

    if (!contractId || !status || amountCollected === undefined || !paidOn) {
      res.status(400).json({ error: "contractId, status, amountCollected, and paidOn are required" });
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

    const onboarding = await prisma.onboardingPayment.upsert({
      where: { contractId },
      update: {
        status,
        amountCollected: Number(amountCollected),
        paidOn,
        notes: notes ?? null,
      },
      create: {
        contractId,
        clientName: clientName ?? contract.clientName,
        salesperson: salesperson ?? contract.salesperson,
        status,
        amountCollected: Number(amountCollected),
        paidOn,
        notes: notes ?? null,
      },
    });

    res.status(201).json(onboarding);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save onboarding payment" });
  }
});

export default router;
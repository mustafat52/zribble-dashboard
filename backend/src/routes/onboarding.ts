import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canWrite } from "../middleware/role";

const router = Router();
router.use(authenticate);

// ── GET /onboarding/:clientName ───────────────────────────────────────────────
// A client can have multiple services (multiple contracts), each with its own
// onboarding payment outcome — OnboardingPayment.contractId is unique, not
// clientName. Returns ALL onboarding records for this client (one per
// service that has one), not just the first match, so a client with e.g. DM
// "not collected" and GMB "collected" shows both instead of one silently
// overwriting the other in the response.
router.get("/:clientName", async (req: Request, res: Response) => {
  try {
    const onboardings = await prisma.onboardingPayment.findMany({
      where: { clientName: decodeURIComponent(req.params.clientName) },
    });

    res.json(onboardings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch onboarding payments" });
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
    if (user.role === "account_manager" && contract.accountManager !== user.accountManager) {
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
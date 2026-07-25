import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canWrite } from "../middleware/role";
import { recalcRenewalStatus } from "../lib/renewalStatus";

const router = Router();
router.use(authenticate);

// ── GET /promises ─────────────────────────────────────────────────────────────
// Returns all promises visible to the requesting user.
// Employees see only their own salesperson's promises.
// Admins / accounts team see all.
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const where =
      user.role === "employee" && user.salesperson
        ? { salesperson: user.salesperson }
        : user.role === "account_manager" && user.accountManager
        ? { contract: { accountManager: user.accountManager } }
        : {};

    const promises = await prisma.promise.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(promises);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch promises" });
  }
});

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
    if (user.role === "account_manager" && contract.accountManager !== user.accountManager) {
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

    // NEW: a promise on its own used to be purely informational — it never
    // touched RenewalMonth.status, which is why a renewal with ₹0 collected
    // but a full balance promised for later stayed stuck on "pending."
    // Recalculating here lets a ₹0-paid renewal resolve to "promised"
    // instead, as long as an active promise now exists for it.
    await recalcRenewalStatus(contractId, Number(renewalYear), Number(renewalMonth));

    res.status(201).json(promise);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create promise" });
  }
});

// ── DELETE /promises/:id ──────────────────────────────────────────────────────
router.delete("/:id", canWrite, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const promise = await prisma.promise.findUnique({ where: { id: req.params.id } });

    if (!promise) {
      res.status(404).json({ error: "Promise not found" });
      return;
    }

    if (user.role === "employee" && promise.salesperson !== user.salesperson) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (user.role === "account_manager") {
      // Promise has no accountManager field of its own — join through
      // the parent contract to check AM ownership.
      const contract = await prisma.contract.findUnique({ where: { id: promise.contractId } });
      if (!contract || contract.accountManager !== user.accountManager) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
    }

    await prisma.promise.delete({ where: { id: req.params.id } });

    // NEW: if this was the only promise keeping the renewal at "promised"
    // (₹0 collected, no other promise left), deleting it should drop the
    // status back to "pending" — otherwise a stale "promised" badge would
    // stick around with nothing backing it.
    await recalcRenewalStatus(promise.contractId, promise.renewalYear, promise.renewalMonth);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete promise" });
  }
});

export default router;
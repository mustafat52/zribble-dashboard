import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canWrite } from "../middleware/role";

const router = Router();
router.use(authenticate);

// ── GET /contracts ────────────────────────────────────────────────────────────
// super_admin / accounts_team → all contracts
// employee → own salesperson only
router.get("/", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const where =
      user.role === "employee" && user.salesperson
        ? { salesperson: user.salesperson }
        : {};

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        renewalMonths: { orderBy: [{ year: "asc" }, { month: "asc" }] },
        payments: { orderBy: { createdAt: "desc" } },
        promises: { orderBy: { createdAt: "desc" } },
        onboarding: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(contracts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

// ── GET /contracts/:id ────────────────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: {
        renewalMonths: { orderBy: [{ year: "asc" }, { month: "asc" }] },
        payments: { orderBy: { createdAt: "desc" } },
        promises: { orderBy: { createdAt: "desc" } },
        onboarding: true,
        contractEdits: { orderBy: { editedAt: "desc" } },
      },
    });

    if (!contract) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }

    // Employees can only view their own contracts
    if (user.role === "employee" && contract.salesperson !== user.salesperson) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    res.json(contract);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch contract" });
  }
});

// ── POST /contracts ───────────────────────────────────────────────────────────
router.post("/", canWrite, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const {
      salesperson, clientName, product, accountManager, contractId,
      profiles, gstStatus, dealValue, contractTermMonths, firstRenewalDate,
      renewalSchedule,
    } = req.body;

    // Employees can only create under their own salesperson name
    const effectiveSalesperson =
      user.role === "employee" ? user.salesperson! : salesperson;

    const contract = await prisma.contract.create({
      data: {
        salesperson: effectiveSalesperson,
        clientName,
        product,
        accountManager,
        contractId: contractId ?? null,
        profiles: Number(profiles),
        gstStatus,
        dealValue: Number(dealValue),
        contractTermMonths: Number(contractTermMonths),
        firstRenewalDate,
        contractStatus: "active",
        renewalMonths: renewalSchedule
          ? {
              create: (renewalSchedule as Array<{ year: number; month: number; amount: number }>)
                .filter((r) => r.amount > 0)
                .map((r) => ({
                  year: r.year,
                  month: r.month,
                  amount: r.amount,
                  status: "pending" as const,
                })),
            }
          : undefined,
      },
      include: { renewalMonths: true },
    });

    res.status(201).json(contract);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create contract" });
  }
});

// ── PATCH /contracts/:id ──────────────────────────────────────────────────────
router.patch("/:id", canWrite, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const existing = await prisma.contract.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }

    if (user.role === "employee" && existing.salesperson !== user.salesperson) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const allowedFields = [
      "clientName", "product", "accountManager", "contractId",
      "profiles", "gstStatus", "dealValue", "contractTermMonths", "firstRenewalDate",
    ];

    const changes: Record<string, unknown> = {};
    const previousValues: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined && req.body[field] !== (existing as Record<string, unknown>)[field]) {
        changes[field] = req.body[field];
        previousValues[field] = (existing as Record<string, unknown>)[field];
      }
    }

    const [updated] = await prisma.$transaction([
      prisma.contract.update({
        where: { id: req.params.id },
        data: changes as Parameters<typeof prisma.contract.update>[0]["data"],
        include: { renewalMonths: true },
      }),
      prisma.contractEdit.create({
        data: {
          contractId: req.params.id,
          changes,
          previousValues,
          editedBy: user.userId,
        },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update contract" });
  }
});

// ── PATCH /contracts/:id/status ───────────────────────────────────────────────
router.patch("/:id/status", canWrite, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { contractStatus } = req.body as { contractStatus: "active" | "stopped" };

    if (!["active", "stopped"].includes(contractStatus)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    const existing = await prisma.contract.findUnique({ where: { id: req.params.id } });

    if (!existing) {
      res.status(404).json({ error: "Contract not found" });
      return;
    }

    if (user.role === "employee" && existing.salesperson !== user.salesperson) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const updated = await prisma.contract.update({
      where: { id: req.params.id },
      data: { contractStatus },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update contract status" });
  }
});

export default router;
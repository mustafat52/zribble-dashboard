import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";

const router = Router();
router.use(authenticate);

// ── GET /services ─────────────────────────────────────────────────────────────
// Open to any authenticated user — New Entry and Insights need this to
// populate their dropdowns/filters. Only POST and PATCH below are restricted
// to super_admin.
// Returns all services, active first, then retired, alphabetically within
// each group — retired ones stay visible here so an admin can reactivate them.
router.get("/", async (_req: Request, res: Response) => {
  try {
    const services = await prisma.service.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    res.json(services);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch services" });
  }
});

// ── POST /services ────────────────────────────────────────────────────────────
// Super admin only. Creates a new service.
// Returns 409 if a service with that name already exists (even if retired —
// the admin should reactivate the existing one instead of creating a duplicate).
router.post("/", requireRole("super_admin"), async (req: Request, res: Response) => {
  try {
    const adminUser = req.user!;
    const { name } = req.body as { name: string };

    if (!name?.trim()) {
      res.status(400).json({ error: "Service name is required" });
      return;
    }

    const existing = await prisma.service.findUnique({ where: { name: name.trim() } });
    if (existing) {
      res.status(409).json({ error: "A service with this name already exists" });
      return;
    }

    const service = await prisma.service.create({
      data: { name: name.trim(), isActive: true, createdBy: adminUser.userId },
    });

    res.status(201).json(service);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create service" });
  }
});

// ── PATCH /services/:id ───────────────────────────────────────────────────────
// Super admin only. Toggles isActive (retire or reactivate a service).
// Also allows renaming — though renaming is only safe if no contracts currently
// use the old name; the admin is responsible for this check.
router.patch("/:id", requireRole("super_admin"), async (req: Request, res: Response) => {
  try {
    const { name, isActive } = req.body as { name?: string; isActive?: boolean };

    const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    // Check name uniqueness if renaming
    if (name && name.trim() !== existing.name) {
      const nameTaken = await prisma.service.findUnique({ where: { name: name.trim() } });
      if (nameTaken) {
        res.status(409).json({ error: "A service with this name already exists" });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.service.update({
      where: { id: req.params.id },
      data: updateData as Parameters<typeof prisma.service.update>[0]["data"],
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update service" });
  }
});

// NOTE: intentionally no DELETE endpoint. Services are never hard-deleted —
// only retired (isActive: false) — because existing contracts may already
// reference a service name and must never end up pointing at nothing.

export default router;
import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/role";

const router = Router();

// All user management is super_admin only
router.use(authenticate);
router.use(requireRole("super_admin"));

const SALT_ROUNDS = 10;

// ── GET /users ────────────────────────────────────────────────────────────────
router.get("/", async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mode: true,
        salesperson: true,
        createdAt: true,
        createdBy: true,
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ── POST /users ───────────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  try {
    const adminUser = req.user!;
    const { name, email, password, role, mode, salesperson } = req.body as {
      name: string;
      email: string;
      password: string;
      role: "super_admin" | "accounts_team" | "employee";
      mode?: "view" | "view_edit";
      salesperson?: string;
    };

    if (!name || !email || !password || !role) {
      res.status(400).json({ error: "name, email, password, and role are required" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
        mode: mode ?? null,
        salesperson: salesperson ?? null,
        createdBy: adminUser.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mode: true,
        salesperson: true,
        createdAt: true,
        createdBy: true,
      },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// ── PATCH /users/:id ──────────────────────────────────────────────────────────
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, mode, salesperson } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: "super_admin" | "accounts_team" | "employee";
      mode?: "view" | "view_edit" | null;
      salesperson?: string | null;
    };

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Check email uniqueness if changing it
    if (email && email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        res.status(409).json({ error: "Email already in use" });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (mode !== undefined) updateData.mode = mode;
    if (salesperson !== undefined) updateData.salesperson = salesperson;
    if (password) updateData.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData as Parameters<typeof prisma.user.update>[0]["data"],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mode: true,
        salesperson: true,
        createdAt: true,
        createdBy: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ── DELETE /users/:id ─────────────────────────────────────────────────────────
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const adminUser = req.user!;

    // Prevent self-deletion
    if (req.params.id === adminUser.userId) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
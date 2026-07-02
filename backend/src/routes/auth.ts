import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { authenticate, AuthUser } from "../middleware/auth";

const router = Router();

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Constant-time response — don't reveal whether email exists
      await bcrypt.compare(password, "$2b$10$invalidhashpadding000000000000000000000000000000000000");
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not configured");

    const payload: AuthUser = {
      userId: user.id,
      role: user.role,
      mode: user.mode ?? undefined,
      salesperson: user.salesperson ?? undefined,
      accountManager: user.accountManager ?? undefined,
    };

    const token = jwt.sign(payload, secret, { expiresIn: "7d" });

    const isProd = process.env.NODE_ENV === "production";

    // httpOnly cookie — never exposed to JS
    // secure + sameSite:"none" required in prod (cross-origin Vercel → Railway)
    // lax + no secure required in local dev (same-origin HTTP)
    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mode: user.mode,
        salesperson: user.salesperson,
        accountManager: user.accountManager,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post("/logout", authenticate, (_req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === "production";

  // clearCookie options must exactly match the set options or the browser won't clear it
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  res.json({ success: true });
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        mode: true,
        salesperson: true,
        accountManager: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
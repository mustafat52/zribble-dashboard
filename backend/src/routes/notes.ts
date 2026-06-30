import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { canWrite } from "../middleware/role";

const router = Router();
router.use(authenticate);

// ── GET /notes/:clientName ────────────────────────────────────────────────────
router.get("/:clientName", async (req: Request, res: Response) => {
  try {
    const notes = await prisma.clientNote.findMany({
      where: { clientName: decodeURIComponent(req.params.clientName) },
      orderBy: { createdAt: "desc" },
    });
    res.json(notes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// ── POST /notes ───────────────────────────────────────────────────────────────
router.post("/", canWrite, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { clientName, text } = req.body;

    if (!clientName || !text) {
      res.status(400).json({ error: "clientName and text are required" });
      return;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });

    const note = await prisma.clientNote.create({
      data: { clientName, text, createdBy: dbUser?.name ?? "Unknown" },
    });

    res.status(201).json(note);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

export default router;
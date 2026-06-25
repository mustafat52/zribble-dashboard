import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth";
import contractRoutes from "./routes/contracts";
import renewalRoutes from "./routes/renewals";
import paymentRoutes from "./routes/payments";
import promiseRoutes from "./routes/promises";
import noteRoutes from "./routes/notes";
import onboardingRoutes from "./routes/onboarding";
import overrideRoutes from "./routes/overrides";
import dashboardRoutes from "./routes/dashboard";
import userRoutes from "./routes/users";

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ────────────────────────────────────────────────────────────────────
// credentials: true requires an exact origin — never "*"
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ── Body / Cookie parsing ────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/contracts", contractRoutes);
app.use("/renewals", renewalRoutes);
app.use("/payments", paymentRoutes);
app.use("/promises", promiseRoutes);
app.use("/notes", noteRoutes);
app.use("/onboarding", onboardingRoutes);
app.use("/price-overrides", overrideRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/users", userRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(PORT, () => {
  console.log(`ZribbleOS backend running on port ${PORT}`);
});

export default app;
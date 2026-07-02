import { Request, Response, NextFunction } from "express";
import { AuthUser } from "./auth";

type Role = AuthUser["role"];
type Mode = AuthUser["mode"];

/**
 * requireRole(...roles)
 * Rejects the request if req.user.role is not in the allowed list.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

/**
 * requireMode(...modes)
 * For employees and account_managers: rejects unless their mode matches.
 * super_admin and accounts_team always pass through (they have no mode restriction).
 */
export function requireMode(...modes: Mode[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    // Non-employees and non-account-managers are not subject to mode checks
    if (user.role !== "employee" && user.role !== "account_manager") {
      next();
      return;
    }
    if (!user.mode || !modes.includes(user.mode)) {
      res.status(403).json({ error: "Forbidden: insufficient permissions" });
      return;
    }
    next();
  };
}

/**
 * canWrite
 * Shorthand: super_admin OR (employee with view_edit mode) OR (account_manager with view_edit mode).
 * accounts_team cannot write.
 */
export function canWrite(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const allowed =
    user.role === "super_admin" ||
    (user.role === "employee" && user.mode === "view_edit") ||
    (user.role === "account_manager" && user.mode === "view_edit");

  if (!allowed) {
    res.status(403).json({ error: "Forbidden: write access required" });
    return;
  }
  next();
}
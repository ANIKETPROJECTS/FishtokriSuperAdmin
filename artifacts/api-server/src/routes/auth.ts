import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { HubUser } from "../db/models/hub-user.js";

const router: IRouter = Router();

const ADMIN_EMAIL = "admin@fishtokri.com";
const ADMIN_PASSWORD = "FishTokri@Admin2024";
const JWT_SECRET = process.env.SESSION_SECRET;

if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET must be set.");
}

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  loginRole: z.enum(["master_admin", "super_hub", "sub_hub", "delivery_person"]).optional(),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Email and password are required" });
    return;
  }

  const { email, password, loginRole } = parsed.data;

  // Master Admin portal: only accepts hardcoded credentials, never DB users
  if (loginRole === "master_admin") {
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }
    const admin = { id: "master-admin-1", email: ADMIN_EMAIL, name: "Master Admin", role: "master_admin" };
    const token = jwt.sign({ adminId: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, admin });
    return;
  }

  // Super Hub or Sub Hub portal: look up DB
  try {
    const user = await HubUser.findOne({ email });
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials. Please check your email and password." });
      return;
    }
    if (user.status !== "Active") {
      res.status(403).json({ error: "Forbidden", message: "Your account has been deactivated. Contact your administrator." });
      return;
    }

    const expectedRole = loginRole === "sub_hub" ? "sub_hub" : loginRole === "delivery_person" ? "delivery_person" : "super_hub";
    const portalLabel = loginRole === "sub_hub" ? "Sub Hub" : loginRole === "delivery_person" ? "Delivery Person" : "Super Hub";
    if (user.role !== expectedRole) {
      res.status(403).json({ error: "Forbidden", message: `Your account does not have ${portalLabel} portal access.` });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials. Please check your email and password." });
      return;
    }

    const resolvedSuperHubIds: string[] =
      Array.isArray((user as any).superHubIds) && (user as any).superHubIds.length > 0
        ? (user as any).superHubIds.map((id: any) => String(id))
        : user.superHubId ? [String(user.superHubId)] : [];

    const resolvedSubHubIds: string[] =
      Array.isArray((user as any).subHubIds) && (user as any).subHubIds.length > 0
        ? (user as any).subHubIds.map((id: any) => String(id))
        : user.subHubId ? [String(user.subHubId)] : [];

    const admin = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      superHubId: resolvedSuperHubIds[0] ?? null,
      superHubIds: resolvedSuperHubIds,
      subHubId: resolvedSubHubIds[0] ?? null,
      subHubIds: resolvedSubHubIds,
    };
    const token = jwt.sign({ adminId: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, admin });
  } catch (err) {
    res.status(500).json({ error: "InternalError", message: "Login failed" });
  }
});

export default router;

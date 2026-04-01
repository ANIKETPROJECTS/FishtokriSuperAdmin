import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { HubUser } from "../db/models/hub-user.js";

const router: IRouter = Router();

const ADMIN_EMAIL = "admin@fishtokri.com";
const ADMIN_PASSWORD = "FishTokri@Admin2024";
const JWT_SECRET = process.env.SESSION_SECRET || "fishtokri-secret-key-change-in-prod";

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
  loginRole: z.enum(["master_admin", "super_hub"]).optional(),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Email and password are required" });
    return;
  }

  const { email, password, loginRole } = parsed.data;

  if (email === ADMIN_EMAIL) {
    // Master admin hardcoded credentials — only accessible via the master_admin portal
    if (loginRole === "super_hub") {
      res.status(403).json({ error: "Forbidden", message: "This account does not have Super Hub access. Use the Master Admin portal." });
      return;
    }
    if (password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }
    const admin = { id: "master-admin-1", email: ADMIN_EMAIL, name: "Master Admin", role: "master_admin" };
    const token = jwt.sign({ adminId: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, admin });
    return;
  }

  try {
    const user = await HubUser.findOne({ email });
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }
    if (user.status !== "Active") {
      res.status(403).json({ error: "Forbidden", message: "Your account has been deactivated. Contact your administrator." });
      return;
    }
    // Role-portal validation: super_hub portal only accepts super_hub role users
    if (loginRole === "super_hub" && user.role !== "super_hub") {
      res.status(403).json({ error: "Forbidden", message: "Your account does not have Super Hub portal access." });
      return;
    }
    // Master admin portal should not accept DB users (they should use their own portal)
    if (loginRole === "master_admin") {
      res.status(403).json({ error: "Forbidden", message: "This account does not have Master Admin access." });
      return;
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }
    const admin = {
      id: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      superHubId: user.superHubId ? String(user.superHubId) : null,
      subHubId: user.subHubId ? String(user.subHubId) : null,
    };
    const token = jwt.sign({ adminId: admin.id, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, admin });
  } catch (err) {
    res.status(500).json({ error: "InternalError", message: "Login failed" });
  }
});

export default router;

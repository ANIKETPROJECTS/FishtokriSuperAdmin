import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

const router: IRouter = Router();

const ADMIN_EMAIL = "admin@fishtokri.com";
const ADMIN_PASSWORD = "FishTokri@Admin2024";
const JWT_SECRET = process.env.SESSION_SECRET || "fishtokri-secret-key-change-in-prod";

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

router.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ValidationError", message: "Email and password are required" });
    return;
  }

  const { email, password } = parsed.data;

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    return;
  }

  const admin = {
    id: "super-admin-1",
    email: ADMIN_EMAIL,
    name: "Super Admin",
  };

  const token = jwt.sign({ adminId: admin.id, email: admin.email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.json({ token, admin });
});

export default router;

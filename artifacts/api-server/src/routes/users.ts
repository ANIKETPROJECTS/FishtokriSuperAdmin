import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { HubUser } from "../db/models/hub-user.js";
import { SuperHub } from "../db/models/super-hub.js";
import { SubHub } from "../db/models/sub-hub.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();
router.use(requireAuth as any);

async function enrichUser(user: any) {
  let superHubName: string | null = null;
  let subHubName: string | null = null;
  if (user.superHubId) {
    const sh = await SuperHub.findById(user.superHubId);
    superHubName = sh?.name ?? null;
  }
  if (user.subHubId) {
    const sub = await SubHub.findById(user.subHubId);
    subHubName = sub?.name ?? null;
  }
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    superHubId: user.superHubId ? String(user.superHubId) : null,
    superHubName,
    subHubId: user.subHubId ? String(user.subHubId) : null,
    subHubName,
    status: user.status,
    createdAt: user.createdAt,
  };
}

router.get("/", async (req, res) => {
  try {
    const roleFilter = req.query.role as string | undefined;
    const superHubIdFilter = req.query.superHubId as string | undefined;
    const filter: Record<string, any> = {};
    if (roleFilter) filter.role = roleFilter;
    if (superHubIdFilter) filter.superHubId = superHubIdFilter;
    const users = await HubUser.find(filter).sort({ createdAt: 1 });
    const enriched = await Promise.all(users.map(enrichUser));
    res.json({ users: enriched, total: enriched.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get users");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch users" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, role, superHubId, subHubId, status, password } = req.body;
    if (!name || !email) { res.status(400).json({ error: "ValidationError", message: "Name and email are required" }); return; }
    if (!password) { res.status(400).json({ error: "ValidationError", message: "Password is required" }); return; }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await HubUser.create({
      name,
      email,
      phone: phone ?? "",
      role: role ?? "sub_hub",
      password: hashedPassword,
      superHubId: superHubId || null,
      subHubId: subHubId || null,
      status: status ?? "Active",
    });
    const enriched = await enrichUser(user);
    res.status(201).json({ user: enriched });
  } catch (err: any) {
    if (err.code === 11000) {
      res.status(400).json({ error: "DuplicateEmail", message: "A user with this email already exists" });
      return;
    }
    req.log.error({ err }, "Failed to create user");
    res.status(500).json({ error: "InternalError", message: "Failed to create user" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const user = await HubUser.findById(req.params.id);
    if (!user) { res.status(404).json({ error: "NotFound", message: "User not found" }); return; }
    const { name, email, phone, role, superHubId, subHubId, status, password } = req.body;
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (superHubId !== undefined) user.superHubId = superHubId || null;
    if (subHubId !== undefined) user.subHubId = subHubId || null;
    if (status !== undefined) user.status = status;
    if (password && password.trim() !== "") {
      user.password = await bcrypt.hash(password, 10);
    }
    await user.save();
    const enriched = await enrichUser(user);
    res.json({ user: enriched });
  } catch (err) {
    req.log.error({ err }, "Failed to update user");
    res.status(500).json({ error: "InternalError", message: "Failed to update user" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const user = await HubUser.findById(req.params.id);
    if (!user) { res.status(404).json({ error: "NotFound", message: "User not found" }); return; }
    await HubUser.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete user");
    res.status(500).json({ error: "InternalError", message: "Failed to delete user" });
  }
});

router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const user = await HubUser.findById(req.params.id);
    if (!user) { res.status(404).json({ error: "NotFound", message: "User not found" }); return; }
    user.status = user.status === "Active" ? "Inactive" : "Active";
    await user.save();
    const enriched = await enrichUser(user);
    res.json({ user: enriched });
  } catch (err) {
    req.log.error({ err }, "Failed to toggle user status");
    res.status(500).json({ error: "InternalError", message: "Failed to toggle status" });
  }
});

export default router;

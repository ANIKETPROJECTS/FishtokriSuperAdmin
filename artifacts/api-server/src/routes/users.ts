import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { hubUsersTable, superHubsTable, subHubsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth as any);

async function enrichUser(user: typeof hubUsersTable.$inferSelect) {
  let superHubName: string | null = null;
  let subHubName: string | null = null;
  if (user.superHubId) {
    const [sh] = await db.select().from(superHubsTable).where(eq(superHubsTable.id, user.superHubId));
    superHubName = sh?.name ?? null;
  }
  if (user.subHubId) {
    const [sub] = await db.select().from(subHubsTable).where(eq(subHubsTable.id, user.subHubId));
    subHubName = sub?.name ?? null;
  }
  return {
    id: String(user.id),
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
    let query = db.select().from(hubUsersTable);
    let users;
    if (roleFilter) {
      users = await db.select().from(hubUsersTable).where(eq(hubUsersTable.role, roleFilter));
    } else if (superHubIdFilter) {
      const shId = parseInt(superHubIdFilter, 10);
      users = await db.select().from(hubUsersTable).where(eq(hubUsersTable.superHubId, shId));
    } else {
      users = await db.select().from(hubUsersTable);
    }
    const enriched = await Promise.all(users.map(enrichUser));
    res.json({ users: enriched, total: enriched.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get users");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch users" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, role, superHubId, subHubId, status } = req.body;
    if (!name || !email) { res.status(400).json({ error: "ValidationError", message: "Name and email are required" }); return; }
    const [user] = await db.insert(hubUsersTable).values({
      name,
      email,
      phone: phone ?? "",
      role: role ?? "sub_hub",
      superHubId: superHubId ? parseInt(superHubId, 10) : null,
      subHubId: subHubId ? parseInt(subHubId, 10) : null,
      status: status ?? "Active",
    }).returning();
    const enriched = await enrichUser(user);
    res.status(201).json({ user: enriched });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(400).json({ error: "DuplicateEmail", message: "A user with this email already exists" });
      return;
    }
    req.log.error({ err }, "Failed to create user");
    res.status(500).json({ error: "InternalError", message: "Failed to create user" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "BadRequest", message: "Invalid ID" }); return; }
    const [existing] = await db.select().from(hubUsersTable).where(eq(hubUsersTable.id, id));
    if (!existing) { res.status(404).json({ error: "NotFound", message: "User not found" }); return; }
    const { name, email, phone, role, superHubId, subHubId, status } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (phone !== undefined) update.phone = phone;
    if (role !== undefined) update.role = role;
    if (superHubId !== undefined) update.superHubId = superHubId ? parseInt(superHubId, 10) : null;
    if (subHubId !== undefined) update.subHubId = subHubId ? parseInt(subHubId, 10) : null;
    if (status !== undefined) update.status = status;
    const [user] = await db.update(hubUsersTable).set(update).where(eq(hubUsersTable.id, id)).returning();
    const enriched = await enrichUser(user);
    res.json({ user: enriched });
  } catch (err) {
    req.log.error({ err }, "Failed to update user");
    res.status(500).json({ error: "InternalError", message: "Failed to update user" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "BadRequest", message: "Invalid ID" }); return; }
    const [existing] = await db.select().from(hubUsersTable).where(eq(hubUsersTable.id, id));
    if (!existing) { res.status(404).json({ error: "NotFound", message: "User not found" }); return; }
    await db.delete(hubUsersTable).where(eq(hubUsersTable.id, id));
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete user");
    res.status(500).json({ error: "InternalError", message: "Failed to delete user" });
  }
});

router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "BadRequest", message: "Invalid ID" }); return; }
    const [existing] = await db.select().from(hubUsersTable).where(eq(hubUsersTable.id, id));
    if (!existing) { res.status(404).json({ error: "NotFound", message: "User not found" }); return; }
    const newStatus = existing.status === "Active" ? "Inactive" : "Active";
    const [user] = await db.update(hubUsersTable).set({ status: newStatus }).where(eq(hubUsersTable.id, id)).returning();
    const enriched = await enrichUser(user);
    res.json({ user: enriched });
  } catch (err) {
    req.log.error({ err }, "Failed to toggle user status");
    res.status(500).json({ error: "InternalError", message: "Failed to toggle status" });
  }
});

export default router;

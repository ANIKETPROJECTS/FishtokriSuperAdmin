import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { superHubsTable, subHubsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth as any);

router.get("/", async (req, res) => {
  try {
    const superHubs = await db.select().from(superHubsTable).orderBy(superHubsTable.createdAt);
    const subCounts = await db
      .select({ superHubId: subHubsTable.superHubId, count: sql<number>`count(*)::int` })
      .from(subHubsTable)
      .groupBy(subHubsTable.superHubId);
    const countMap = Object.fromEntries(subCounts.map((c) => [c.superHubId, c.count]));
    const result = superHubs.map((h) => ({
      id: String(h.id),
      name: h.name,
      location: h.location,
      imageUrl: h.imageUrl,
      status: h.status,
      subHubCount: countMap[h.id] ?? 0,
      createdAt: h.createdAt,
    }));
    res.json({ superHubs: result, total: result.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get super hubs");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch super hubs" });
  }
});

router.get("/:id/sub-hubs", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "BadRequest", message: "Invalid ID" }); return; }
    const [superHub] = await db.select().from(superHubsTable).where(eq(superHubsTable.id, id));
    if (!superHub) { res.status(404).json({ error: "NotFound", message: "Super hub not found" }); return; }
    const subHubs = await db.select().from(subHubsTable).where(eq(subHubsTable.superHubId, id));
    const result = subHubs.map((s) => ({
      id: String(s.id),
      superHubId: String(s.superHubId),
      superHubName: superHub.name,
      name: s.name,
      location: s.location,
      imageUrl: s.imageUrl ?? "",
      pincodes: s.pincodes as string[],
      status: s.status,
      createdAt: s.createdAt,
    }));
    res.json({ subHubs: result, total: result.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get sub hubs");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch sub hubs" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "BadRequest", message: "Invalid ID" }); return; }
    const [superHub] = await db.select().from(superHubsTable).where(eq(superHubsTable.id, id));
    if (!superHub) { res.status(404).json({ error: "NotFound", message: "Super hub not found" }); return; }
    const subHubs = await db.select().from(subHubsTable).where(eq(subHubsTable.superHubId, id));
    const subHubCount = subHubs.length;
    const sh = {
      id: String(superHub.id),
      name: superHub.name,
      location: superHub.location,
      imageUrl: superHub.imageUrl,
      status: superHub.status,
      subHubCount,
      createdAt: superHub.createdAt,
    };
    const subResult = subHubs.map((s) => ({
      id: String(s.id),
      superHubId: String(s.superHubId),
      superHubName: superHub.name,
      name: s.name,
      location: s.location,
      pincodes: s.pincodes as string[],
      status: s.status,
      createdAt: s.createdAt,
    }));
    res.json({ superHub: sh, subHubs: subResult });
  } catch (err) {
    req.log.error({ err }, "Failed to get super hub");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch super hub" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, location, imageUrl, status } = req.body;
    if (!name) { res.status(400).json({ error: "ValidationError", message: "Name is required" }); return; }
    const [hub] = await db.insert(superHubsTable).values({
      name,
      location: location ?? "",
      imageUrl: imageUrl ?? "",
      status: status ?? "Active",
    }).returning();
    const sh = { id: String(hub.id), name: hub.name, location: hub.location, imageUrl: hub.imageUrl, status: hub.status, subHubCount: 0, createdAt: hub.createdAt };
    res.status(201).json({ superHub: sh });
  } catch (err) {
    req.log.error({ err }, "Failed to create super hub");
    res.status(500).json({ error: "InternalError", message: "Failed to create super hub" });
  }
});

router.post("/:id/sub-hubs", async (req, res) => {
  try {
    const superHubId = parseInt(req.params.id, 10);
    if (isNaN(superHubId)) { res.status(400).json({ error: "BadRequest", message: "Invalid ID" }); return; }
    const [superHub] = await db.select().from(superHubsTable).where(eq(superHubsTable.id, superHubId));
    if (!superHub) { res.status(404).json({ error: "NotFound", message: "Super hub not found" }); return; }
    const { name, location, pincodes, status } = req.body;
    if (!name) { res.status(400).json({ error: "ValidationError", message: "Name is required" }); return; }
    const [sub] = await db.insert(subHubsTable).values({
      superHubId,
      name,
      location: location ?? "",
      pincodes: pincodes ?? [],
      status: status ?? "Active",
    }).returning();
    const result = { id: String(sub.id), superHubId: String(sub.superHubId), superHubName: superHub.name, name: sub.name, location: sub.location, pincodes: sub.pincodes as string[], status: sub.status, createdAt: sub.createdAt };
    res.status(201).json({ subHub: result });
  } catch (err) {
    req.log.error({ err }, "Failed to create sub hub");
    res.status(500).json({ error: "InternalError", message: "Failed to create sub hub" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "BadRequest", message: "Invalid ID" }); return; }
    const [existing] = await db.select().from(superHubsTable).where(eq(superHubsTable.id, id));
    if (!existing) { res.status(404).json({ error: "NotFound", message: "Super hub not found" }); return; }
    const { name, location, imageUrl, status } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (location !== undefined) update.location = location;
    if (imageUrl !== undefined) update.imageUrl = imageUrl;
    if (status !== undefined) update.status = status;
    const [hub] = await db.update(superHubsTable).set(update).where(eq(superHubsTable.id, id)).returning();
    const subCount = await db.$count(subHubsTable, eq(subHubsTable.superHubId, id));
    const sh = { id: String(hub.id), name: hub.name, location: hub.location, imageUrl: hub.imageUrl, status: hub.status, subHubCount: subCount, createdAt: hub.createdAt };
    res.json({ superHub: sh });
  } catch (err) {
    req.log.error({ err }, "Failed to update super hub");
    res.status(500).json({ error: "InternalError", message: "Failed to update super hub" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "BadRequest", message: "Invalid ID" }); return; }
    const [existing] = await db.select().from(superHubsTable).where(eq(superHubsTable.id, id));
    if (!existing) { res.status(404).json({ error: "NotFound", message: "Super hub not found" }); return; }
    await db.delete(superHubsTable).where(eq(superHubsTable.id, id));
    res.json({ message: "Super hub deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete super hub");
    res.status(500).json({ error: "InternalError", message: "Failed to delete super hub" });
  }
});

router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "BadRequest", message: "Invalid ID" }); return; }
    const [existing] = await db.select().from(superHubsTable).where(eq(superHubsTable.id, id));
    if (!existing) { res.status(404).json({ error: "NotFound", message: "Super hub not found" }); return; }
    const newStatus = existing.status === "Active" ? "Inactive" : "Active";
    const [hub] = await db.update(superHubsTable).set({ status: newStatus }).where(eq(superHubsTable.id, id)).returning();
    const subCount = await db.$count(subHubsTable, eq(subHubsTable.superHubId, id));
    const sh = { id: String(hub.id), name: hub.name, location: hub.location, imageUrl: hub.imageUrl, status: hub.status, subHubCount: subCount, createdAt: hub.createdAt };
    res.json({ superHub: sh });
  } catch (err) {
    req.log.error({ err }, "Failed to toggle super hub status");
    res.status(500).json({ error: "InternalError", message: "Failed to toggle status" });
  }
});

export default router;

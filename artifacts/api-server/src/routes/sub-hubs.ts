import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { subHubsTable, superHubsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth as any);

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "BadRequest", message: "Invalid ID" }); return; }
    const [existing] = await db.select().from(subHubsTable).where(eq(subHubsTable.id, id));
    if (!existing) { res.status(404).json({ error: "NotFound", message: "Sub hub not found" }); return; }
    const { name, location, pincodes, status, imageUrl } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (location !== undefined) update.location = location;
    if (pincodes !== undefined) update.pincodes = pincodes;
    if (status !== undefined) update.status = status;
    if (imageUrl !== undefined) update.imageUrl = imageUrl;
    const [sub] = await db.update(subHubsTable).set(update).where(eq(subHubsTable.id, id)).returning();
    const [superHub] = await db.select().from(superHubsTable).where(eq(superHubsTable.id, sub.superHubId));
    const result = { id: String(sub.id), superHubId: String(sub.superHubId), superHubName: superHub?.name ?? "", name: sub.name, location: sub.location, imageUrl: sub.imageUrl ?? "", pincodes: sub.pincodes as string[], status: sub.status, createdAt: sub.createdAt };
    res.json({ subHub: result });
  } catch (err) {
    req.log.error({ err }, "Failed to update sub hub");
    res.status(500).json({ error: "InternalError", message: "Failed to update sub hub" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "BadRequest", message: "Invalid ID" }); return; }
    const [existing] = await db.select().from(subHubsTable).where(eq(subHubsTable.id, id));
    if (!existing) { res.status(404).json({ error: "NotFound", message: "Sub hub not found" }); return; }
    await db.delete(subHubsTable).where(eq(subHubsTable.id, id));
    res.json({ message: "Sub hub deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete sub hub");
    res.status(500).json({ error: "InternalError", message: "Failed to delete sub hub" });
  }
});

router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "BadRequest", message: "Invalid ID" }); return; }
    const [existing] = await db.select().from(subHubsTable).where(eq(subHubsTable.id, id));
    if (!existing) { res.status(404).json({ error: "NotFound", message: "Sub hub not found" }); return; }
    const newStatus = existing.status === "Active" ? "Inactive" : "Active";
    const [sub] = await db.update(subHubsTable).set({ status: newStatus }).where(eq(subHubsTable.id, id)).returning();
    const [superHub] = await db.select().from(superHubsTable).where(eq(superHubsTable.id, sub.superHubId));
    const result = { id: String(sub.id), superHubId: String(sub.superHubId), superHubName: superHub?.name ?? "", name: sub.name, location: sub.location, imageUrl: sub.imageUrl ?? "", pincodes: sub.pincodes as string[], status: sub.status, createdAt: sub.createdAt };
    res.json({ subHub: result });
  } catch (err) {
    req.log.error({ err }, "Failed to toggle sub hub status");
    res.status(500).json({ error: "InternalError", message: "Failed to toggle status" });
  }
});

export default router;

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { hubsTable, insertHubSchema, updateHubSchema } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.use(requireAuth as any);

router.get("/stats/summary", async (req, res) => {
  try {
    const allHubs = await db.select().from(hubsTable);
    const total = allHubs.length;
    const active = allHubs.filter((h) => h.status === "Active").length;
    const inactive = allHubs.filter((h) => h.status === "Inactive").length;
    const totalServiceAreas = allHubs.reduce((acc, h) => acc + (h.serviceAreas as string[]).length, 0);
    res.json({ total, active, inactive, totalServiceAreas });
  } catch (err) {
    req.log.error({ err }, "Failed to get hub stats");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch hub statistics" });
  }
});

router.get("/", async (req, res) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    let hubs;
    if (statusFilter === "Active" || statusFilter === "Inactive") {
      hubs = await db.select().from(hubsTable).where(eq(hubsTable.status, statusFilter));
    } else {
      hubs = await db.select().from(hubsTable);
    }
    res.json({ hubs, total: hubs.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get hubs");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch hubs" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid hub ID" });
      return;
    }
    const [hub] = await db.select().from(hubsTable).where(eq(hubsTable.id, id));
    if (!hub) {
      res.status(404).json({ error: "NotFound", message: "Hub not found" });
      return;
    }
    res.json({ hub });
  } catch (err) {
    req.log.error({ err }, "Failed to get hub");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch hub" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = insertHubSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "ValidationError", message: "Invalid hub data" });
      return;
    }
    const data = parsed.data;
    const [hub] = await db
      .insert(hubsTable)
      .values({
        name: data.name,
        location: data.location ?? "",
        serviceAreas: data.serviceAreas ?? [],
        status: data.status ?? "Active",
      })
      .returning();
    res.status(201).json({ hub });
  } catch (err) {
    req.log.error({ err }, "Failed to create hub");
    res.status(500).json({ error: "InternalError", message: "Failed to create hub" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid hub ID" });
      return;
    }
    const parsed = updateHubSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "ValidationError", message: "Invalid hub data" });
      return;
    }
    const [existing] = await db.select().from(hubsTable).where(eq(hubsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "NotFound", message: "Hub not found" });
      return;
    }
    const updateData: Record<string, unknown> = {};
    const data = parsed.data;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.serviceAreas !== undefined) updateData.serviceAreas = data.serviceAreas;
    if (data.status !== undefined) updateData.status = data.status;
    const [hub] = await db.update(hubsTable).set(updateData).where(eq(hubsTable.id, id)).returning();
    res.json({ hub });
  } catch (err) {
    req.log.error({ err }, "Failed to update hub");
    res.status(500).json({ error: "InternalError", message: "Failed to update hub" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid hub ID" });
      return;
    }
    const [existing] = await db.select().from(hubsTable).where(eq(hubsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "NotFound", message: "Hub not found" });
      return;
    }
    await db.delete(hubsTable).where(eq(hubsTable.id, id));
    res.json({ message: "Hub deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete hub");
    res.status(500).json({ error: "InternalError", message: "Failed to delete hub" });
  }
});

router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "BadRequest", message: "Invalid hub ID" });
      return;
    }
    const [existing] = await db.select().from(hubsTable).where(eq(hubsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "NotFound", message: "Hub not found" });
      return;
    }
    const newStatus = existing.status === "Active" ? "Inactive" : "Active";
    const [hub] = await db
      .update(hubsTable)
      .set({ status: newStatus })
      .where(eq(hubsTable.id, id))
      .returning();
    res.json({ hub });
  } catch (err) {
    req.log.error({ err }, "Failed to toggle hub status");
    res.status(500).json({ error: "InternalError", message: "Failed to toggle hub status" });
  }
});

export default router;

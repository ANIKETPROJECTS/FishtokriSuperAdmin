import { Router, type IRouter } from "express";
import { SubHub } from "../db/models/sub-hub.js";
import { SuperHub } from "../db/models/super-hub.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();
router.use(requireAuth as any);

router.put("/:id", async (req, res) => {
  try {
    const sub = await SubHub.findById(req.params.id);
    if (!sub) { res.status(404).json({ error: "NotFound", message: "Sub hub not found" }); return; }
    const { name, location, pincodes, status, imageUrl } = req.body;
    if (name !== undefined) sub.name = name;
    if (location !== undefined) sub.location = location;
    if (pincodes !== undefined) sub.pincodes = pincodes;
    if (status !== undefined) sub.status = status;
    if (imageUrl !== undefined) sub.imageUrl = imageUrl;
    await sub.save();
    const superHub = await SuperHub.findById(sub.superHubId);
    const result = { id: String(sub._id), superHubId: String(sub.superHubId), superHubName: superHub?.name ?? "", name: sub.name, location: sub.location, imageUrl: sub.imageUrl ?? "", pincodes: sub.pincodes, status: sub.status, createdAt: sub.createdAt };
    res.json({ subHub: result });
  } catch (err) {
    req.log.error({ err }, "Failed to update sub hub");
    res.status(500).json({ error: "InternalError", message: "Failed to update sub hub" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const sub = await SubHub.findById(req.params.id);
    if (!sub) { res.status(404).json({ error: "NotFound", message: "Sub hub not found" }); return; }
    await SubHub.findByIdAndDelete(req.params.id);
    res.json({ message: "Sub hub deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete sub hub");
    res.status(500).json({ error: "InternalError", message: "Failed to delete sub hub" });
  }
});

router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const sub = await SubHub.findById(req.params.id);
    if (!sub) { res.status(404).json({ error: "NotFound", message: "Sub hub not found" }); return; }
    sub.status = sub.status === "Active" ? "Inactive" : "Active";
    await sub.save();
    const superHub = await SuperHub.findById(sub.superHubId);
    const result = { id: String(sub._id), superHubId: String(sub.superHubId), superHubName: superHub?.name ?? "", name: sub.name, location: sub.location, imageUrl: sub.imageUrl ?? "", pincodes: sub.pincodes, status: sub.status, createdAt: sub.createdAt };
    res.json({ subHub: result });
  } catch (err) {
    req.log.error({ err }, "Failed to toggle sub hub status");
    res.status(500).json({ error: "InternalError", message: "Failed to toggle status" });
  }
});

export default router;

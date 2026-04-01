import { Router, type IRouter } from "express";
import { SuperHub } from "../db/models/super-hub.js";
import { SubHub } from "../db/models/sub-hub.js";
import { HubUser } from "../db/models/hub-user.js";
import { requireAuth } from "../middlewares/auth.js";

const router: IRouter = Router();
router.use(requireAuth as any);

router.get("/summary", async (req, res) => {
  try {
    const [superHubs, subHubs, users] = await Promise.all([
      SuperHub.find(),
      SubHub.find(),
      HubUser.find(),
    ]);

    const totalSuperHubs = superHubs.length;
    const activeSuperHubs = superHubs.filter((h) => h.status === "Active").length;
    const totalSubHubs = subHubs.length;
    const activeSubHubs = subHubs.filter((h) => h.status === "Active").length;
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.status === "Active").length;
    const totalPincodes = subHubs.reduce((acc, s) => acc + (s.pincodes?.length ?? 0), 0);

    res.json({ totalSuperHubs, activeSuperHubs, totalSubHubs, activeSubHubs, totalUsers, activeUsers, totalPincodes });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch statistics" });
  }
});

export default router;

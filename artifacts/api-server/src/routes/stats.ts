import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { superHubsTable, subHubsTable, hubUsersTable } from "@workspace/db/schema";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth as any);

router.get("/summary", async (req, res) => {
  try {
    const superHubs = await db.select().from(superHubsTable);
    const subHubs = await db.select().from(subHubsTable);
    const users = await db.select().from(hubUsersTable);

    const totalSuperHubs = superHubs.length;
    const activeSuperHubs = superHubs.filter((h) => h.status === "Active").length;
    const totalSubHubs = subHubs.length;
    const activeSubHubs = subHubs.filter((h) => h.status === "Active").length;
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.status === "Active").length;
    const totalPincodes = subHubs.reduce((acc, s) => acc + (s.pincodes as string[]).length, 0);

    res.json({ totalSuperHubs, activeSuperHubs, totalSubHubs, activeSubHubs, totalUsers, activeUsers, totalPincodes });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "InternalError", message: "Failed to fetch statistics" });
  }
});

export default router;

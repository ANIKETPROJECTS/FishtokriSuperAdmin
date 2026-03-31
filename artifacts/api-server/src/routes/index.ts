import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import superHubsRouter from "./super-hubs";
import subHubsRouter from "./sub-hubs";
import usersRouter from "./users";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/super-hubs", superHubsRouter);
router.use("/sub-hubs", subHubsRouter);
router.use("/users", usersRouter);
router.use("/stats", statsRouter);

export default router;

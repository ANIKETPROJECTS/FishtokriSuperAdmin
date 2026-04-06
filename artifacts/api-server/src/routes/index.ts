import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import superHubsRouter from "./super-hubs";
import subHubsRouter from "./sub-hubs";
import subHubMenuRouter from "./sub-hub-menu";
import usersRouter from "./users";
import statsRouter from "./stats";
import uploadRouter from "./upload";
import customersRouter from "./customers";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/super-hubs", superHubsRouter);
router.use("/sub-hubs", subHubsRouter);
router.use("/sub-hubs/:id/menu", subHubMenuRouter);
router.use("/users", usersRouter);
router.use("/stats", statsRouter);
router.use("/upload", uploadRouter);
router.use("/customers", customersRouter);

export default router;

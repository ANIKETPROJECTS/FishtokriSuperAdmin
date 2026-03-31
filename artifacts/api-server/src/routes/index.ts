import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import hubsRouter from "./hubs";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/hubs", hubsRouter);

export default router;

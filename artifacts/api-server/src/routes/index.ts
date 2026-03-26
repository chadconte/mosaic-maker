import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mosaicRouter from "./mosaic";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/mosaic", mosaicRouter);

export default router;

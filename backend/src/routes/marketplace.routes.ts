import { Router } from "express";
import {
  createMarketplace,
  deleteMarketplace,
  purchaseMarketplace,
  listMarketplace,
} from "../controllers/marketplace.controller.js";

const router = Router();

router.get("/listings", listMarketplace);
router.post("/listings", createMarketplace);
router.delete("/listings/:id", deleteMarketplace);
router.post("/listings/:id/purchase", purchaseMarketplace);

export default router;



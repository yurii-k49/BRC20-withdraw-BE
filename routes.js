import express from 'express';
import { registerRequest, checkWallets, checkInscribe, getRealData } from './controller.js';

const router = express.Router();

// router.post("/sendBtc", sendBtc);
router.get("/get-real-data/:ordinalAddress", getRealData);
router.post("/claim", registerRequest);
router.post("/check-wallet", checkWallets);
router.post("/check-inscribe", checkInscribe);

export default router;
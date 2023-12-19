import express from 'express';
import { registerRequest, checkWallets, checkInscribe } from './controller.js';

const router = express.Router();

// router.post("/sendBtc", sendBtc);
router.post("/claim", registerRequest);
router.post("/check-wallet", checkWallets);
router.post("/check-inscribe", checkInscribe);

export default router;
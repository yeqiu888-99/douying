import express from 'express';
import { createOrderHandler, paymentNotifyHandler } from '../controllers/orderController.js';
import { getConfigHandler } from '../controllers/configController.js';

const router = express.Router();

router.get('/config', getConfigHandler);
router.post('/orders/create', createOrderHandler);
router.post('/payment/notify', paymentNotifyHandler);

export default router;

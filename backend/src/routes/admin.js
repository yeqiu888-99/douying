import express from 'express';
import { handleLogin, requireAdmin } from '../middleware/adminAuth.js';
import { listOrdersHandler, orderDetailHandler, markAnsweredHandler } from '../controllers/adminController.js';

const router = express.Router();

router.post('/login', handleLogin);
router.get('/orders', requireAdmin, listOrdersHandler);
router.get('/orders/:id', requireAdmin, orderDetailHandler);
router.post('/orders/:id/answer', requireAdmin, markAnsweredHandler);

export default router;

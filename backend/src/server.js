import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';

import apiRoutes from './routes/api.js';
import adminRoutes from './routes/admin.js';
import { sessionMiddleware } from './middleware/adminAuth.js';
import { findExpiredPendingAnswer, processRefund } from './services/orderService.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(bodyParser.json());
app.use(sessionMiddleware());

app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  console.error('unhandled error', err);
  res.status(500).json({ message: '服务器错误' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});

// Cron job: every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const expiredOrders = await findExpiredPendingAnswer();
    console.log(`[cron] found ${expiredOrders.length} expired orders`);
    for (const order of expiredOrders) {
      console.log('[cron] processing refund', order.order_no);
      await processRefund(order);
    }
  } catch (err) {
    console.error('[cron] error', err);
  }
});

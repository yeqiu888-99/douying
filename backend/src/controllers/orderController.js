import { createOrder, markPaid } from '../services/orderService.js';
import { verifyPaymentCallback } from '../services/paymentService.js';

export async function createOrderHandler(req, res) {
  try {
    const { nickname, contact, question, reply_limit_minutes, douyin_openid } = req.body;
    if (!nickname || !contact || !question || !reply_limit_minutes || !douyin_openid) {
      return res.status(400).json({ message: '参数不完整' });
    }
    const result = await createOrder({
      nickname,
      contact,
      question,
      reply_limit_minutes,
      douyin_openid,
    });
    res.json({ orderNo: result.orderNo, payParams: result.payParams });
  } catch (err) {
    console.error('create order error', err);
    res.status(500).json({ message: '创建订单失败' });
  }
}

export async function paymentNotifyHandler(req, res) {
  try {
    const payload = verifyPaymentCallback(req.body);
    const { order_no: orderNo, payment_no: paymentNo, total_fee } = payload;
    await markPaid({ orderNo, paymentNo, paidAmount: total_fee });
    res.json({ code: 'SUCCESS' });
  } catch (err) {
    console.error('payment notify error', err);
    res.status(500).json({ code: 'FAIL', message: '处理失败' });
  }
}

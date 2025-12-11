import { nanoid } from 'nanoid';
import { query } from '../utils/db.js';
import { createPrepayOrder, refundOrder } from './paymentService.js';

const CONSULT_AMOUNT = 20000; // in cents

export async function createOrder(payload) {
  const {
    douyin_openid,
    nickname,
    contact,
    question,
    reply_limit_minutes,
  } = payload;

  const orderNo = `C${Date.now()}${nanoid(6)}`;
  const now = new Date();

  await query(
    `INSERT INTO consultation_orders 
      (order_no, douyin_openid, nickname, contact, question, reply_limit_minutes, amount, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_pay', ?)`
    , [orderNo, douyin_openid, nickname, contact, question, reply_limit_minutes, CONSULT_AMOUNT / 100, now]);

  const payParams = await createPrepayOrder({
    orderNo,
    amount: CONSULT_AMOUNT,
    description: '咨询费',
  });

  return { orderNo, payParams };
}

export async function markPaid({ orderNo, paymentNo, paidAmount }) {
  const now = new Date();
  const orders = await query('SELECT * FROM consultation_orders WHERE order_no = ?', [orderNo]);
  if (!orders.length) {
    throw new Error('order not found');
  }
  const order = orders[0];
  const expireAt = new Date(now.getTime() + order.reply_limit_minutes * 60000);
  await query(
    `UPDATE consultation_orders SET status='pending_answer', payment_no=?, paid_at=?, expire_at=?, amount=? WHERE order_no=?`,
    [paymentNo, now, expireAt, paidAmount / 100, orderNo]
  );
  console.log('[order] paid update', { orderNo, paymentNo, expireAt });
  return { ...order, expire_at: expireAt };
}

export async function listOrders(filterStatus) {
  let sql = 'SELECT * FROM consultation_orders ORDER BY created_at DESC';
  const params = [];
  if (filterStatus) {
    sql = 'SELECT * FROM consultation_orders WHERE status=? ORDER BY created_at DESC';
    params.push(filterStatus);
  }
  return query(sql, params);
}

export async function getOrderById(id) {
  const rows = await query('SELECT * FROM consultation_orders WHERE id=?', [id]);
  return rows[0];
}

export async function markAnswered(id, answerSummary) {
  const now = new Date();
  await query(
    `UPDATE consultation_orders SET status='answered', answer_summary=?, answered_at=? WHERE id=?`,
    [answerSummary, now, id]
  );
  return getOrderById(id);
}

export async function processRefund(order) {
  const refundResult = await refundOrder({
    orderNo: order.order_no,
    paymentNo: order.payment_no,
    amount: order.amount * 100,
  });
  if (refundResult.success) {
    await query(
      `UPDATE consultation_orders SET status='refunded', refund_no=?, refunded_at=?, refund_reason=? WHERE id=?`,
      [refundResult.refundNo, refundResult.refundedAt, '超时未答复自动退款', order.id]
    );
    return { success: true };
  }
  await query(
    `UPDATE consultation_orders SET status='refund_failed', refund_reason=? WHERE id=?`,
    ['自动退款失败', order.id]
  );
  return { success: false };
}

export async function findExpiredPendingAnswer() {
  const now = new Date();
  return query(
    `SELECT * FROM consultation_orders WHERE status='pending_answer' AND expire_at <= ?`,
    [now]
  );
}

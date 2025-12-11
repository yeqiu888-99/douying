import { listOrders, getOrderById, markAnswered } from '../services/orderService.js';

export async function listOrdersHandler(req, res) {
  try {
    const { status } = req.query;
    const rows = await listOrders(status);
    res.json(rows);
  } catch (err) {
    console.error('list orders error', err);
    res.status(500).json({ message: '获取订单失败' });
  }
}

export async function orderDetailHandler(req, res) {
  try {
    const { id } = req.params;
    const row = await getOrderById(id);
    if (!row) return res.status(404).json({ message: 'not found' });
    res.json(row);
  } catch (err) {
    console.error('get order detail error', err);
    res.status(500).json({ message: '获取详情失败' });
  }
}

export async function markAnsweredHandler(req, res) {
  try {
    const { id } = req.params;
    const { answer_summary } = req.body;
    if (!answer_summary) return res.status(400).json({ message: '回答摘要必填' });
    const updated = await markAnswered(id, answer_summary);
    res.json(updated);
  } catch (err) {
    console.error('mark answered error', err);
    res.status(500).json({ message: '更新失败' });
  }
}

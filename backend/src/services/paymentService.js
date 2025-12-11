import crypto from 'crypto';

// Placeholder payment integration. Replace with actual Douyin payment SDK when available.
export async function createPrepayOrder({ orderNo, amount, description }) {
  // In real implementation, call Douyin unified order API here.
  const mockNonce = crypto.randomBytes(8).toString('hex');
  return {
    orderNo,
    amount,
    description,
    timeStamp: `${Math.floor(Date.now() / 1000)}`,
    nonceStr: mockNonce,
    package: `prepay_id=mock_${orderNo}`,
    signType: 'MD5',
    paySign: crypto.createHash('md5').update(orderNo + mockNonce).digest('hex'),
  };
}

export async function refundOrder({ orderNo, paymentNo, amount }) {
  // In real implementation, call Douyin refund API.
  console.log('[payment] mock refund start', { orderNo, paymentNo, amount });
  return {
    refundNo: `refund_${orderNo}`,
    refundedAt: new Date(),
    success: true,
  };
}

export function verifyPaymentCallback(payload) {
  // Replace with signature verification; here we trust payload for demo.
  return payload;
}

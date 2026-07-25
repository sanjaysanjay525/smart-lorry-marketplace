/**
 * Razorpay payment adapter — uses mock when keys are not configured.
 * Phase 2 will wire this into trip booking flow.
 */

import { config } from '../config';

const isRazorpayConfigured = !!(config.razorpay.keyId && config.razorpay.keySecret);

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  mock: boolean;
}

export async function createPaymentOrder(
  amountPaise: number,
  receipt: string,
): Promise<PaymentOrder> {
  if (!isRazorpayConfigured) {
    return {
      orderId: `mock_order_${receipt}`,
      amount: amountPaise,
      currency: 'INR',
      mock: true,
    };
  }

  const Razorpay = (await import('razorpay')).default;
  const razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt,
  });

  return {
    orderId: order.id,
    amount: amountPaise,
    currency: 'INR',
    mock: false,
  };
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  if (!isRazorpayConfigured) {
    return signature === 'mock_signature_dev';
  }

  const crypto = require('crypto') as typeof import('crypto');
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(body)
    .digest('hex');
  return expected === signature;
}

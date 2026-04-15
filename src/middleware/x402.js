import { HIVECONSULT_INTERNAL_KEY } from './auth.js';

const HIVE_PAYMENT_ADDRESS = process.env.HIVE_PAYMENT_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc9e7595f5bA16';
const USDC_CONTRACT = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const BASE_CHAIN_ID = 8453;

// ─── Payment Middleware ──────────────────────────────────────

export function requirePayment(priceUsdc, operationName) {
  return (req, res, next) => {
    // Internal key bypass
    const internalKey = req.headers['x-hive-internal'];
    if (internalKey === HIVECONSULT_INTERNAL_KEY) {
      req.paymentVerified = true;
      req.paymentSource = 'internal';
      req.costUsdc = 0;
      return next();
    }

    // Check for X-Payment header (x402 protocol)
    const paymentHeader = req.headers['x-payment'] || req.headers['x-payment-hash'] || req.headers['x-402-tx'];
    if (paymentHeader) {
      // Accept payment header as proof of payment
      req.paymentVerified = true;
      req.paymentSource = 'x402';
      req.costUsdc = priceUsdc;
      return next();
    }

    // No payment — return 402 with payment challenge
    return res.status(402).json({
      status: '402 Payment Required',
      service: 'HiveConsult',
      operation: operationName,
      protocol: 'x402',
      payment: {
        amount_usdc: priceUsdc,
        currency: 'USDC',
        network: 'base',
        chain_id: BASE_CHAIN_ID,
        contract: USDC_CONTRACT,
        recipient: HIVE_PAYMENT_ADDRESS,
        accepted_methods: ['x402_signature', 'onchain_tx_hash'],
        instructions: 'Include payment proof in X-Payment header to proceed.'
      }
    });
  };
}

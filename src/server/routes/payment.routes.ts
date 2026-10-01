import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import HoldService from '../services/HoldService';

const router = Router();
const holdService = HoldService.getInstance();

interface PendingPayment {
  userId: string;
  holdId: string;
  status: string;
  createdAt: number;
}

const pendingPayments = new Map<string, PendingPayment>();

router.post('/initiate', async (req: Request, res: Response) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

  const status = await holdService.getUserStatus(userId);
  if (!status.hold) return res.status(400).json({ success: false, error: 'No active hold found.' });

  const paymentId = randomUUID();
  pendingPayments.set(paymentId, {
    userId,
    holdId: status.hold.holdId,
    status: 'pending',
    createdAt: Date.now(),
  });

  scheduleWebhook(paymentId, userId, status.hold.holdId);
  console.log(`Payment initiated: ${paymentId} for user ${userId}`);
  res.json({ success: true, paymentId, message: 'Payment initiated. Awaiting confirmation.' });
});

router.post('/webhook', async (req: Request, res: Response) => {
  const { paymentId, userId, holdId, event } = req.body as {
    paymentId?: string;
    userId?: string;
    holdId?: string;
    event?: string;
  };

  if (!paymentId || !userId || !holdId || !event) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  console.log(`Webhook received: event=${event}, paymentId=${paymentId}`);

  if (event !== 'payment.succeeded') {
    return res.json({ success: true, ignored: true, reason: `Event ${event} not handled` });
  }

  res.json(await holdService.processPayment(paymentId, userId, holdId));
});

router.get('/status/:paymentId', (req: Request, res: Response) => {
  const payment = pendingPayments.get(req.params.paymentId as string);
  res.json(payment ? { success: true, ...payment } : { success: true, status: 'unknown' });
});

function scheduleWebhook(paymentId: string, userId: string, holdId: string): void {
  const baseDelay = 500 + Math.random() * 3500;
  const isDuplicate = Math.random() < 0.3;
  const isOutOfOrder = Math.random() < 0.1;

  const sendWebhook = (event: string, delay: number): void => {
    setTimeout(async () => {
      try {
        const baseUrl = process.env.BASE_URL ?? 'http://localhost:3001';
        const { default: fetch } = await import('node-fetch');
        await fetch(`${baseUrl}/api/payment/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId, userId, holdId, event }),
        });
        console.log(`Webhook sent: event=${event}, delay=${Math.round(delay)}ms`);
      } catch (err) {
        console.error('Webhook delivery failed:', (err as Error).message);
      }
    }, delay);
  };

  if (isOutOfOrder) {
    sendWebhook('payment.processing', baseDelay * 0.3);
    sendWebhook('payment.succeeded', baseDelay);
    console.log(`Out-of-order simulation for ${paymentId}`);
  } else {
    sendWebhook('payment.succeeded', baseDelay);
  }

  if (isDuplicate) {
    sendWebhook('payment.succeeded', baseDelay + 500 + Math.random() * 1000);
    console.log(`Duplicate webhook simulation for ${paymentId}`);
  }
}

export default router;

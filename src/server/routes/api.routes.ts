import { Router, Request, Response } from 'express';
import HoldService from '../services/HoldService';

const router = Router();
const holdService = HoldService.getInstance();

router.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const status = await holdService.getUserStatus(req.params.userId as string);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/hold', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
    res.json(await holdService.placeHold(userId));
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/waitlist/join', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
    res.json(await holdService.joinWaitlist(userId));
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/waitlist/leave', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId?: string };
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
    await holdService.leaveWaitlist(userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

router.post('/reset', async (_req: Request, res: Response) => {
  try {
    await holdService.resetAll();
    res.json({ success: true, message: 'System reset: stock=20, waitlist cleared' });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;

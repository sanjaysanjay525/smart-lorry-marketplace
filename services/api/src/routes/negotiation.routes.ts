import { Router } from 'express';
import { negotiateRate, getNegotiation } from '../services/negotiation.service';
import { authenticate } from '../middleware/auth';
import { UserRole } from '@slm/shared';

const router = Router();

router.use(authenticate);

router.post('/:loadPostingId/negotiate', async (req, res, next) => {
  try {
    const { userOffer, baseRate, distanceKm } = req.body;
    const result = await negotiateRate(req.params.loadPostingId, userOffer, baseRate, distanceKm, req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:loadPostingId/negotiation', async (req, res, next) => {
  try {
    const result = await getNegotiation(req.params.loadPostingId, req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export const negotiationRoutes = router;

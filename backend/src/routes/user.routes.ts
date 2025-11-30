import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Placeholder for user routes
router.get('/favorites', authenticate, (req, res) => {
  res.json({ success: true, favorites: [] });
});

export default router;
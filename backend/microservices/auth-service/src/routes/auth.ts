import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateJWT, requireAdmin } from '../middleware/auth';
import { validateRefreshToken, validateRole } from '../middleware/validation';

const router = Router();
const authController = new AuthController();

// Public routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.post('/refresh', validateRefreshToken, authController.refreshToken);

// Protected routes
router.get('/me', authenticateJWT, authController.getCurrentUser);
router.post('/logout', authenticateJWT, authController.logout);
router.post('/logout-all', authenticateJWT, authController.logoutAll);

// Admin routes
router.get('/users', authenticateJWT, requireAdmin, authController.getAllUsers);
router.put('/users/:userId/role', authenticateJWT, requireAdmin, validateRole, authController.updateUserRole);
router.delete('/users/:userId', authenticateJWT, requireAdmin, authController.deleteUser);

export default router;
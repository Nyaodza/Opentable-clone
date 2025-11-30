import { Router } from 'express';
import accessibilityController from '../controllers/accessibility.controller';

const router = Router();

// User accessibility profiles
router.post('/profile', accessibilityController.createProfile);
router.post('/content/adapt', accessibilityController.getAdaptedContent);

// Restaurant accessibility
router.post('/restaurants/search', accessibilityController.findAccessibleRestaurants);
router.get('/report/:restaurantId', accessibilityController.generateReport);
router.get('/navigation/:restaurantId', accessibilityController.getNavigationAssistance);

// Accessibility auditing
router.post('/audit', accessibilityController.performAudit);

// Content generation
router.post('/audio', accessibilityController.generateAudio);

export default router;
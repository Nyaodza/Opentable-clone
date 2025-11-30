import { Router } from 'express';
import dynamicPricingController from '../controllers/dynamic-pricing.controller';

const router = Router();

// Pricing rules management
router.post('/rules', dynamicPricingController.createPricingRule);
router.get('/rules/:restaurantId', dynamicPricingController.getPricingRules);
router.put('/rules/:ruleId', dynamicPricingController.updatePricingRule);
router.delete('/rules/:ruleId', dynamicPricingController.deletePricingRule);

// Price calculation and optimization
router.post('/calculate', dynamicPricingController.calculatePrice);
router.post('/optimize/:restaurantId', dynamicPricingController.optimizePricing);

// Analytics and forecasting
router.get('/demand/:restaurantId', dynamicPricingController.getDemandForecast);
router.get('/competitor-analysis/:restaurantId', dynamicPricingController.getCompetitorAnalysis);
router.get('/analytics/:restaurantId', dynamicPricingController.getPricingAnalytics);

export default router;
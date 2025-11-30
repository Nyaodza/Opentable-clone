import { Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { DynamicPricingService } from '../services/dynamicPricing.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';

export class DynamicPricingController {
  private pricingService: DynamicPricingService;

  constructor() {
    this.pricingService = Container.get(DynamicPricingService);
  }

  /**
   * @swagger
   * /api/pricing/rules:
   *   post:
   *     summary: Create pricing rule
   *     tags: [Dynamic Pricing]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/PricingRule'
   *     responses:
   *       201:
   *         description: Pricing rule created
   */
  createPricingRule = [
    authenticate,
    authorize('restaurant_admin'),
    body('restaurantId').isString().notEmpty(),
    body('type').isIn(['surge', 'time_based', 'demand_based', 'seasonal', 'event']),
    body('name').isString().notEmpty(),
    body('conditions').isObject(),
    body('adjustment').isObject(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const rule = await this.pricingService.createPricingRule(
          req.body.restaurantId,
          req.body
        );
        res.status(201).json({ success: true, data: rule });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/pricing/calculate:
   *   post:
   *     summary: Calculate dynamic price
   *     tags: [Dynamic Pricing]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               restaurantId:
   *                 type: string
   *               dateTime:
   *                 type: string
   *               partySize:
   *                 type: number
   *               tableType:
   *                 type: string
   *     responses:
   *       200:
   *         description: Calculated price
   */
  calculatePrice = [
    body('restaurantId').isString().notEmpty(),
    body('dateTime').isISO8601(),
    body('partySize').isInt({ min: 1 }),
    body('tableType').optional().isString(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.pricingService.calculateDynamicPrice(
          req.body.restaurantId,
          new Date(req.body.dateTime),
          req.body.partySize,
          req.body.tableType
        );
        res.json({ success: true, data: result });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/pricing/demand/{restaurantId}:
   *   get:
   *     summary: Get demand forecast
   *     tags: [Dynamic Pricing]
   *     parameters:
   *       - in: path
   *         name: restaurantId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: date
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Demand forecast
   */
  getDemandForecast = [
    param('restaurantId').isString().notEmpty(),
    query('date').isISO8601(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const forecast = await this.pricingService.getDemandForecast(
          req.params.restaurantId,
          new Date(req.query.date as string)
        );
        res.json({ success: true, data: forecast });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/pricing/competitor-analysis/{restaurantId}:
   *   get:
   *     summary: Get competitor pricing analysis
   *     tags: [Dynamic Pricing]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: restaurantId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Competitor analysis
   */
  getCompetitorAnalysis = [
    authenticate,
    authorize('restaurant_admin'),
    param('restaurantId').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const analysis = await this.pricingService.analyzeCompetitorPricing(
          req.params.restaurantId
        );
        res.json({ success: true, data: analysis });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/pricing/optimize/{restaurantId}:
   *   post:
   *     summary: Optimize pricing strategy
   *     tags: [Dynamic Pricing]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: restaurantId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               targetRevenue:
   *                 type: number
   *               period:
   *                 type: object
   *     responses:
   *       200:
   *         description: Optimized pricing strategy
   */
  optimizePricing = [
    authenticate,
    authorize('restaurant_admin'),
    param('restaurantId').isString().notEmpty(),
    body('targetRevenue').isNumeric(),
    body('period').isObject(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const strategy = await this.pricingService.optimizePricingStrategy(
          req.params.restaurantId,
          req.body.targetRevenue,
          req.body.period
        );
        res.json({ success: true, data: strategy });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/pricing/rules/{restaurantId}:
   *   get:
   *     summary: Get pricing rules for restaurant
   *     tags: [Dynamic Pricing]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: restaurantId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: List of pricing rules
   */
  getPricingRules = [
    authenticate,
    param('restaurantId').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const rules = await this.pricingService.getPricingRules(
          req.params.restaurantId
        );
        res.json({ success: true, data: rules });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/pricing/rules/{ruleId}:
   *   put:
   *     summary: Update pricing rule
   *     tags: [Dynamic Pricing]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ruleId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/PricingRule'
   *     responses:
   *       200:
   *         description: Updated pricing rule
   */
  updatePricingRule = [
    authenticate,
    authorize('restaurant_admin'),
    param('ruleId').isString().notEmpty(),
    body('enabled').optional().isBoolean(),
    body('conditions').optional().isObject(),
    body('adjustment').optional().isObject(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const rule = await this.pricingService.updatePricingRule(
          req.params.ruleId,
          req.body
        );
        res.json({ success: true, data: rule });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/pricing/rules/{ruleId}:
   *   delete:
   *     summary: Delete pricing rule
   *     tags: [Dynamic Pricing]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: ruleId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       204:
   *         description: Rule deleted
   */
  deletePricingRule = [
    authenticate,
    authorize('restaurant_admin'),
    param('ruleId').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.pricingService.deletePricingRule(req.params.ruleId);
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/pricing/analytics/{restaurantId}:
   *   get:
   *     summary: Get pricing analytics
   *     tags: [Dynamic Pricing]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: restaurantId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: startDate
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: endDate
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Pricing analytics
   */
  getPricingAnalytics = [
    authenticate,
    authorize('restaurant_admin'),
    param('restaurantId').isString().notEmpty(),
    query('startDate').isISO8601(),
    query('endDate').isISO8601(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const analytics = await this.pricingService.getPricingAnalytics(
          req.params.restaurantId,
          new Date(req.query.startDate as string),
          new Date(req.query.endDate as string)
        );
        res.json({ success: true, data: analytics });
      } catch (error) {
        next(error);
      }
    }
  ];
}

export default new DynamicPricingController();
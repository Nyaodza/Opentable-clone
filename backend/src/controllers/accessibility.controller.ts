import { Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { AccessibilityService } from '../services/accessibility.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';

export class AccessibilityController {
  private accessibilityService: AccessibilityService;

  constructor() {
    this.accessibilityService = Container.get(AccessibilityService);
  }

  /**
   * @swagger
   * /api/accessibility/profile:
   *   post:
   *     summary: Create accessibility profile
   *     tags: [Accessibility]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/AccessibilityProfile'
   *     responses:
   *       201:
   *         description: Profile created
   */
  createProfile = [
    authenticate,
    body('preferences').isObject(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const profile = await this.accessibilityService.createAccessibilityProfile(
          req.user!.id,
          req.body.preferences
        );
        res.status(201).json({ success: true, data: profile });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/accessibility/content/adapt:
   *   post:
   *     summary: Get adapted content based on user profile
   *     tags: [Accessibility]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               content:
   *                 type: string
   *     responses:
   *       200:
   *         description: Adapted content
   */
  getAdaptedContent = [
    authenticate,
    body('content').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const profile = await this.accessibilityService.getUserProfile(req.user!.id);
        const adapted = await this.accessibilityService.getAdaptedContent(
          req.body.content,
          profile
        );
        res.json({ success: true, data: adapted });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/accessibility/restaurants/search:
   *   post:
   *     summary: Find accessible restaurants
   *     tags: [Accessibility]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               requirements:
   *                 type: object
   *               location:
   *                 type: object
   *                 properties:
   *                   lat:
   *                     type: number
   *                   lng:
   *                     type: number
   *               radius:
   *                 type: number
   *     responses:
   *       200:
   *         description: List of accessible restaurants
   */
  findAccessibleRestaurants = [
    body('requirements').isObject(),
    body('location.lat').isFloat(),
    body('location.lng').isFloat(),
    body('radius').isNumeric(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const restaurants = await this.accessibilityService.findAccessibleRestaurants(
          req.body.requirements,
          req.body.location,
          req.body.radius
        );
        res.json({ success: true, data: restaurants });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/accessibility/audit:
   *   post:
   *     summary: Perform accessibility audit
   *     tags: [Accessibility]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               targetId:
   *                 type: string
   *               targetType:
   *                 type: string
   *                 enum: [page, feature, restaurant]
   *               wcagLevel:
   *                 type: string
   *                 enum: [A, AA, AAA]
   *     responses:
   *       200:
   *         description: Audit report
   */
  performAudit = [
    authenticate,
    authorize('admin'),
    body('targetId').isString().notEmpty(),
    body('targetType').isIn(['page', 'feature', 'restaurant']),
    body('wcagLevel').optional().isIn(['A', 'AA', 'AAA']),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const audit = await this.accessibilityService.performAccessibilityAudit(
          req.body.targetId,
          req.body.targetType,
          req.body.wcagLevel
        );
        res.json({ success: true, data: audit });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/accessibility/navigation/{restaurantId}:
   *   get:
   *     summary: Get navigation assistance
   *     tags: [Accessibility]
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
   *         description: Navigation instructions
   */
  getNavigationAssistance = [
    authenticate,
    param('restaurantId').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const assistance = await this.accessibilityService.provideNavigationAssistance(
          req.user!.id,
          req.params.restaurantId
        );
        res.json({ success: true, data: assistance });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/accessibility/report/{restaurantId}:
   *   get:
   *     summary: Generate accessibility report for restaurant
   *     tags: [Accessibility]
   *     parameters:
   *       - in: path
   *         name: restaurantId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Accessibility report
   */
  generateReport = [
    param('restaurantId').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const report = await this.accessibilityService.generateAccessibilityReport(
          req.params.restaurantId
        );
        res.json({ success: true, data: report });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/accessibility/audio:
   *   post:
   *     summary: Generate audio version of content
   *     tags: [Accessibility]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               text:
   *                 type: string
   *     responses:
   *       200:
   *         description: Audio content URL
   */
  generateAudio = [
    authenticate,
    body('text').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const profile = await this.accessibilityService.getUserProfile(req.user!.id);
        const audio = await this.accessibilityService.generateAudio(
          req.body.text,
          profile
        );
        res.json({ success: true, data: audio });
      } catch (error) {
        next(error);
      }
    }
  ];
}

export default new AccessibilityController();
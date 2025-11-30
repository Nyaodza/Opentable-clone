import { Request, Response, NextFunction } from 'express';
import { Container } from 'typedi';
import { EnhancedLoyaltyService } from '../services/enhancedLoyalty.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';

export class EnhancedLoyaltyController {
  private loyaltyService: EnhancedLoyaltyService;

  constructor() {
    this.loyaltyService = Container.get(EnhancedLoyaltyService);
  }

  /**
   * @swagger
   * /api/loyalty/programs:
   *   post:
   *     summary: Create loyalty program
   *     tags: [Enhanced Loyalty]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoyaltyProgram'
   *     responses:
   *       201:
   *         description: Program created
   */
  createProgram = [
    authenticate,
    authorize('admin'),
    body('name').isString().notEmpty(),
    body('type').isIn(['points', 'tiered', 'subscription', 'hybrid']),
    body('tiers').optional().isArray(),
    body('pointSystem').optional().isObject(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const program = await this.loyaltyService.createLoyaltyProgram(req.body);
        res.status(201).json({ success: true, data: program });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/loyalty/enroll:
   *   post:
   *     summary: Enroll in loyalty program
   *     tags: [Enhanced Loyalty]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               programId:
   *                 type: string
   *               referralCode:
   *                 type: string
   *     responses:
   *       201:
   *         description: Enrollment successful
   */
  enrollMember = [
    authenticate,
    body('programId').isString().notEmpty(),
    body('referralCode').optional().isString(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const member = await this.loyaltyService.enrollMember(
          req.user!.id,
          req.body.programId,
          req.body.referralCode
        );
        res.status(201).json({ success: true, data: member });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/loyalty/points/earn:
   *   post:
   *     summary: Earn loyalty points
   *     tags: [Enhanced Loyalty]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               memberId:
   *                 type: string
   *               source:
   *                 type: object
   *                 properties:
   *                   type:
   *                     type: string
   *                   referenceId:
   *                     type: string
   *                   amount:
   *                     type: number
   *                   description:
   *                     type: string
   *     responses:
   *       200:
   *         description: Points earned
   */
  earnPoints = [
    authenticate,
    body('memberId').isString().notEmpty(),
    body('source.type').isIn(['reservation', 'purchase', 'review', 'referral', 'challenge', 'bonus']),
    body('source.referenceId').isString().notEmpty(),
    body('source.amount').optional().isNumeric(),
    body('source.description').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const transaction = await this.loyaltyService.earnPoints(
          req.body.memberId,
          req.body.source
        );
        res.json({ success: true, data: transaction });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/loyalty/points/redeem:
   *   post:
   *     summary: Redeem loyalty points
   *     tags: [Enhanced Loyalty]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               memberId:
   *                 type: string
   *               redemptionRuleId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Points redeemed
   */
  redeemPoints = [
    authenticate,
    body('memberId').isString().notEmpty(),
    body('redemptionRuleId').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.loyaltyService.redeemPoints(
          req.body.memberId,
          req.body.redemptionRuleId
        );

        if (!result.success) {
          return res.status(400).json({ success: false, error: result.error });
        }

        res.json({ success: true, data: result.transaction });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/loyalty/challenges/{challengeId}/join:
   *   post:
   *     summary: Join a challenge
   *     tags: [Enhanced Loyalty]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: challengeId
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
   *               memberId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Joined challenge
   */
  joinChallenge = [
    authenticate,
    param('challengeId').isString().notEmpty(),
    body('memberId').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await this.loyaltyService.joinChallenge(
          req.body.memberId,
          req.params.challengeId
        );
        res.json({ success: true, message: 'Challenge joined successfully' });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/loyalty/leaderboards/{programId}:
   *   get:
   *     summary: Get program leaderboards
   *     tags: [Enhanced Loyalty]
   *     parameters:
   *       - in: path
   *         name: programId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: period
   *         schema:
   *           type: string
   *           enum: [daily, weekly, monthly, allTime]
   *       - in: query
   *         name: metric
   *         schema:
   *           type: string
   *           enum: [points, visits, spend, referrals]
   *     responses:
   *       200:
   *         description: Leaderboard data
   */
  getLeaderboard = [
    param('programId').isString().notEmpty(),
    query('period').optional().isIn(['daily', 'weekly', 'monthly', 'allTime']),
    query('metric').optional().isIn(['points', 'visits', 'spend', 'referrals']),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const leaderboard = await this.loyaltyService.getLeaderboard(
          req.params.programId,
          req.query.period as any,
          req.query.metric as any
        );
        res.json({ success: true, data: leaderboard });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/loyalty/members/{memberId}:
   *   get:
   *     summary: Get member details
   *     tags: [Enhanced Loyalty]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: memberId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Member details
   */
  getMemberDetails = [
    authenticate,
    param('memberId').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const member = await this.loyaltyService.getMember(req.params.memberId);
        res.json({ success: true, data: member });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/loyalty/members/{memberId}/history:
   *   get:
   *     summary: Get member transaction history
   *     tags: [Enhanced Loyalty]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: memberId
   *         required: true
   *         schema:
   *           type: string
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *       - in: query
   *         name: offset
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Transaction history
   */
  getMemberHistory = [
    authenticate,
    param('memberId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const member = await this.loyaltyService.getMember(req.params.memberId);
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = parseInt(req.query.offset as string) || 0;

        const history = member.history.slice(offset, offset + limit);

        res.json({
          success: true,
          data: {
            history,
            total: member.history.length,
            limit,
            offset
          }
        });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/loyalty/members/{memberId}/badges:
   *   get:
   *     summary: Get member badges
   *     tags: [Enhanced Loyalty]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: memberId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Member badges
   */
  getMemberBadges = [
    authenticate,
    param('memberId').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const member = await this.loyaltyService.getMember(req.params.memberId);
        res.json({
          success: true,
          data: {
            badges: member.achievements.badges,
            milestones: member.achievements.milestones
          }
        });
      } catch (error) {
        next(error);
      }
    }
  ];

  /**
   * @swagger
   * /api/loyalty/programs/{programId}/analytics:
   *   get:
   *     summary: Get program analytics
   *     tags: [Enhanced Loyalty]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: programId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Program analytics
   */
  getProgramAnalytics = [
    authenticate,
    authorize('admin'),
    param('programId').isString().notEmpty(),
    validate,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const program = await this.loyaltyService.getProgram(req.params.programId);
        res.json({ success: true, data: program.analytics });
      } catch (error) {
        next(error);
      }
    }
  ];
}

export default new EnhancedLoyaltyController();
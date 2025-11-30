import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { TranslationService } from '../services/TranslationService';
import { logger } from '../utils/logger';
import { handleControllerError } from '../utils/error-handler';

export class I18nController {
  private static translationService = TranslationService.getInstance();

  /**
   * Get available languages
   */
  static async getAvailableLanguages(req: Request, res: Response): Promise<void> {
    try {
      const { activeOnly = true } = req.query;

      const languages = await I18nController.translationService.getAvailableLanguages(
        activeOnly === 'true'
      );

      res.json({
        success: true,
        data: languages,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get available languages');
    }
  }

  /**
   * Translate text
   */
  static async translateText(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { text, targetLanguage, sourceLanguage, provider, quality } = req.body;

      const translation = await I18nController.translationService.translateText(text, {
        targetLanguage,
        sourceLanguage,
        provider,
        quality,
      });

      res.json({
        success: true,
        data: translation,
      });
    } catch (error) {
      handleControllerError(error, res, 'Error translating text');
    }
  }

  /**
   * Translate listing
   */
  static async translateListing(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { listingId } = req.params;
      const { targetLanguage, sourceLanguage } = req.body;

      const translation = await I18nController.translationService.translateListing(
        listingId,
        targetLanguage,
        sourceLanguage
      );

      res.json({
        success: true,
        data: translation,
      });
    } catch (error) {
      handleControllerError(error, res, 'Error translating listing');
    }
  }

  /**
   * Get listing translations
   */
  static async getListingTranslations(req: Request, res: Response): Promise<void> {
    try {
      const { listingId } = req.params;
      const { language } = req.query;

      const { sequelize } = require('../config/database');

      let whereClause = '"listingId" = ?';
      const replacements = [listingId];

      if (language) {
        whereClause += ' AND language = ?';
        replacements.push(language as string);
      }

      const translations = await sequelize.query(
        `
        SELECT * FROM listing_translations
        WHERE ${whereClause}
        ORDER BY language ASC
        `,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        }
      );

      res.json({
        success: true,
        data: translations,
      });
    } catch (error) {
      handleControllerError(error, res, 'Error getting listing translations');
    }
  }

  /**
   * Batch translate listings
   */
  static async batchTranslateListings(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { listingIds, targetLanguages } = req.body;

      // Start batch translation in background
      I18nController.translationService.batchTranslateListings(listingIds, targetLanguages)
        .then(() => {
          logger.info(`Batch translation completed for ${listingIds.length} listings`);
        })
        .catch(error => {
          logger.error('Batch translation error:', error);
        });

      // Monitor progress
      I18nController.translationService.on('batchProgress', (progress) => {
        logger.info(`Batch translation progress: ${progress.percentage.toFixed(1)}%`);
      });

      res.json({
        success: true,
        message: `Batch translation started for ${listingIds.length} listings in ${targetLanguages.length} languages`,
        estimatedTime: `${(listingIds.length * targetLanguages.length * 2) / 60} minutes`,
      });
    } catch (error) {
      handleControllerError(error, res, 'Error starting batch translation');
    }
  }

  /**
   * Get user language preferences
   */
  static async getUserLanguagePreferences(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const preferences = await I18nController.translationService.getUserLanguagePreference(
        req.user.id
      );

      res.json({
        success: true,
        data: preferences || {
          preferredLanguage: 'en',
          fallbackLanguages: ['en'],
          autoTranslate: true,
          showOriginalText: false,
          preferredCurrency: 'USD',
          preferredUnits: 'metric',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Error getting user language preferences');
    }
  }

  /**
   * Set user language preferences
   */
  static async setUserLanguagePreferences(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      if (!req.user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const preferences = req.body;

      await I18nController.translationService.setUserLanguagePreference(
        req.user.id,
        preferences
      );

      res.json({
        success: true,
        message: 'Language preferences updated',
      });
    } catch (error) {
      handleControllerError(error, res, 'Error setting user language preferences');
    }
  }

  /**
   * Translate amenities
   */
  static async translateAmenities(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { amenities, targetLanguage, context } = req.body;

      const translations = await I18nController.translationService.translateAmenities(
        amenities,
        targetLanguage,
        context
      );

      res.json({
        success: true,
        data: translations,
      });
    } catch (error) {
      handleControllerError(error, res, 'Error translating amenities');
    }
  }

  /**
   * Get translation statistics
   */
  static async getTranslationStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await I18nController.translationService.getTranslationStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      handleControllerError(error, res, 'Error getting translation stats');
    }
  }

  /**
   * Get amenity translations
   */
  static async getAmenityTranslations(req: Request, res: Response): Promise<void> {
    try {
      const { language, context } = req.query;

      const { sequelize } = require('../config/database');

      let whereClause = '1=1';
      const replacements: any[] = [];

      if (language) {
        whereClause += ' AND language = ?';
        replacements.push(language);
      }

      if (context) {
        whereClause += ' AND context = ?';
        replacements.push(context);
      }

      const translations = await sequelize.query(
        `
        SELECT * FROM amenity_translations
        WHERE ${whereClause}
        ORDER BY "amenityKey" ASC
        `,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        }
      );

      res.json({
        success: true,
        data: translations,
      });
    } catch (error) {
      handleControllerError(error, res, 'Error getting amenity translations');
    }
  }

  /**
   * Get category translations
   */
  static async getCategoryTranslations(req: Request, res: Response): Promise<void> {
    try {
      const { language } = req.query;

      const { sequelize } = require('../config/database');

      let whereClause = '1=1';
      const replacements: any[] = [];

      if (language) {
        whereClause += ' AND language = ?';
        replacements.push(language);
      }

      const translations = await sequelize.query(
        `
        SELECT * FROM category_translations
        WHERE ${whereClause}
        ORDER BY "categoryKey" ASC
        `,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        }
      );

      res.json({
        success: true,
        data: translations,
      });
    } catch (error) {
      handleControllerError(error, res, 'Error getting category translations');
    }
  }

  /**
   * Get location translations
   */
  static async getLocationTranslations(req: Request, res: Response): Promise<void> {
    try {
      const { language, locationType } = req.query;

      const { sequelize } = require('../config/database');

      let whereClause = '1=1';
      const replacements: any[] = [];

      if (language) {
        whereClause += ' AND language = ?';
        replacements.push(language);
      }

      if (locationType) {
        whereClause += ' AND "locationType" = ?';
        replacements.push(locationType);
      }

      const translations = await sequelize.query(
        `
        SELECT * FROM location_translations
        WHERE ${whereClause}
        ORDER BY "locationKey" ASC
        `,
        {
          replacements,
          type: sequelize.QueryTypes.SELECT,
        }
      );

      res.json({
        success: true,
        data: translations,
      });
    } catch (error) {
      handleControllerError(error, res, 'Error getting location translations');
    }
  }

  /**
   * Clean up translation cache
   */
  static async cleanupTranslationCache(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { olderThanDays = 30 } = req.query;

      const deletedCount = await I18nController.translationService.cleanupTranslationCache(
        parseInt(olderThanDays as string)
      );

      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} old translation cache entries`,
        deletedCount,
      });
    } catch (error) {
      handleControllerError(error, res, 'Error cleaning up translation cache');
    }
  }

  /**
   * Add or update translation
   */
  static async addTranslation(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      if (!req.user?.id || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const { type, key, language, translation, context, description } = req.body;

      const { sequelize } = require('../config/database');
      const id = require('crypto').randomUUID();

      switch (type) {
        case 'amenity':
          await sequelize.query(
            `
            INSERT INTO amenity_translations (
              id, "amenityKey", language, translation, context, "createdAt", "updatedAt"
            ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            ON CONFLICT ("amenityKey", language, context) DO UPDATE SET
              translation = EXCLUDED.translation,
              "updatedAt" = NOW()
            `,
            {
              replacements: [id, key, language, translation, context || null],
            }
          );
          break;

        case 'category':
          await sequelize.query(
            `
            INSERT INTO category_translations (
              id, "categoryKey", language, translation, description, "createdAt", "updatedAt"
            ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            ON CONFLICT ("categoryKey", language) DO UPDATE SET
              translation = EXCLUDED.translation,
              description = EXCLUDED.description,
              "updatedAt" = NOW()
            `,
            {
              replacements: [id, key, language, translation, description || null],
            }
          );
          break;

        case 'location':
          await sequelize.query(
            `
            INSERT INTO location_translations (
              id, "locationKey", "locationType", language, translation, "createdAt", "updatedAt"
            ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            ON CONFLICT ("locationKey", "locationType", language) DO UPDATE SET
              translation = EXCLUDED.translation,
              "updatedAt" = NOW()
            `,
            {
              replacements: [id, key, context, language, translation],
            }
          );
          break;

        default:
          res.status(400).json({ error: 'Invalid translation type' });
          return;
      }

      res.json({
        success: true,
        message: 'Translation added/updated successfully',
      });
    } catch (error) {
      handleControllerError(error, res, 'Error adding translation');
    }
  }
}
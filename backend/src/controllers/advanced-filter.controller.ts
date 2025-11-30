import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AdvancedFilterService } from '../services/AdvancedFilterService';
import { ServiceType } from '../models/UnifiedListing';
import { logger } from '../utils/logger';
import { QueryTypes } from 'sequelize';
import { handleControllerError } from '../utils/error-handler';

export class AdvancedFilterController {
  private static filterService = AdvancedFilterService.getInstance();

  /**
   * Apply advanced filters to search
   */
  static async applyFilters(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const {
        serviceType,
        location,
        minPrice,
        maxPrice,
        minRating,
        maxRating,
        amenities,
        categories,
        instantConfirmation,
        cancellationPolicy,
        accessibility,
        languagesSupported,
        ageRestrictions,
        groupSize,
        difficulty,
        duration,
        tags,
        highlights,
        included,
        excluded,
        requirements,
        availableFrom,
        availableTo,
        timeSlots,
        sortBy,
        sortOrder,
        page,
        limit,
      } = req.query;

      const filterOptions = {
        serviceType: serviceType as ServiceType,
        location: location as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        maxRating: maxRating ? parseFloat(maxRating as string) : undefined,
        amenities: amenities ? (Array.isArray(amenities) ? amenities : [amenities]) as string[] : undefined,
        categories: categories ? (Array.isArray(categories) ? categories : [categories]) as string[] : undefined,
        instantConfirmation: instantConfirmation === 'true',
        cancellationPolicy: cancellationPolicy as any,
        accessibility: accessibility ? JSON.parse(accessibility as string) : undefined,
        languagesSupported: languagesSupported ? (Array.isArray(languagesSupported) ? languagesSupported : [languagesSupported]) as string[] : undefined,
        ageRestrictions: ageRestrictions ? JSON.parse(ageRestrictions as string) : undefined,
        groupSize: groupSize ? JSON.parse(groupSize as string) : undefined,
        difficulty: difficulty as any,
        duration: duration ? JSON.parse(duration as string) : undefined,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) as string[] : undefined,
        highlights: highlights ? (Array.isArray(highlights) ? highlights : [highlights]) as string[] : undefined,
        included: included ? (Array.isArray(included) ? included : [included]) as string[] : undefined,
        excluded: excluded ? (Array.isArray(excluded) ? excluded : [excluded]) as string[] : undefined,
        requirements: requirements ? (Array.isArray(requirements) ? requirements : [requirements]) as string[] : undefined,
        availableFrom: availableFrom ? new Date(availableFrom as string) : undefined,
        availableTo: availableTo ? new Date(availableTo as string) : undefined,
        timeSlots: timeSlots ? (Array.isArray(timeSlots) ? timeSlots : [timeSlots]) as string[] : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      };

      const result = await AdvancedFilterController.filterService.applyFilters(filterOptions);

      res.json({
        success: true,
        data: result,
        pagination: {
          page: filterOptions.page || 1,
          limit: filterOptions.limit || 20,
          total: result.totalCount,
          totalPages: Math.ceil(result.totalCount / (filterOptions.limit || 20)),
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to apply filters');
    }
  }

  /**
   * Get available filter options for a service type
   */
  static async getAvailableFilters(req: Request, res: Response): Promise<void> {
    try {
      const { serviceType } = req.params;

      if (!Object.values(ServiceType).includes(serviceType as ServiceType)) {
        res.status(400).json({
          error: 'Invalid service type',
          message: `Service type must be one of: ${Object.values(ServiceType).join(', ')}`,
        });
        return;
      }

      const availableFilters = await AdvancedFilterController.filterService.getAvailableFilters(serviceType as ServiceType);

      res.json({
        success: true,
        data: availableFilters,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get available filters');
    }
  }

  /**
   * Get popular filter presets
   */
  static async getFilterPresets(req: Request, res: Response): Promise<void> {
    try {
      const { serviceType } = req.query;

      if (serviceType && !Object.values(ServiceType).includes(serviceType as ServiceType)) {
        res.status(400).json({
          error: 'Invalid service type',
          message: `Service type must be one of: ${Object.values(ServiceType).join(', ')}`,
        });
        return;
      }

      const presets = await AdvancedFilterController.filterService.getFilterPresets(serviceType as ServiceType);

      res.json({
        success: true,
        data: presets,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get filter presets');
    }
  }

  /**
   * Create a new filter preset
   */
  static async createFilterPreset(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { name, description, serviceType, filters, isPublic } = req.body;
      const userId = req.user?.id;

      const preset = await AdvancedFilterController.filterService.createFilterPreset(
        name,
        description,
        serviceType,
        filters,
        userId,
        isPublic
      );

      res.status(201).json({
        success: true,
        data: preset,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to create filter preset');
    }
  }

  /**
   * Get user's saved filters
   */
  static async getSavedFilters(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { serviceType } = req.query;

      if (serviceType && !Object.values(ServiceType).includes(serviceType as ServiceType)) {
        res.status(400).json({
          error: 'Invalid service type',
          message: `Service type must be one of: ${Object.values(ServiceType).join(', ')}`,
        });
        return;
      }

      const savedFilters = await AdvancedFilterController.filterService.getSavedFilters(
        req.user.id,
        serviceType as ServiceType
      );

      res.json({
        success: true,
        data: savedFilters,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get saved filters');
    }
  }

  /**
   * Save a filter
   */
  static async saveFilter(req: Request, res: Response): Promise<void> {
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

      const { name, serviceType, filters, isDefault } = req.body;

      const savedFilter = await AdvancedFilterController.filterService.saveFilter(
        req.user.id,
        name,
        serviceType,
        filters,
        isDefault
      );

      res.status(201).json({
        success: true,
        data: savedFilter,
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to save filter');
    }
  }

  /**
   * Update filter preset usage count
   */
  static async updatePresetUsage(req: Request, res: Response): Promise<void> {
    try {
      const { presetId } = req.params;

      if (!presetId) {
        res.status(400).json({
          error: 'Preset ID is required',
        });
        return;
      }

      const { sequelize } = require('../config/database');

      await sequelize.query(
        'UPDATE filter_presets SET "usageCount" = "usageCount" + 1, "updatedAt" = NOW() WHERE id = ?',
        { replacements: [presetId] }
      );

      res.json({
        success: true,
        message: 'Usage count updated',
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to update preset usage');
    }
  }

  /**
   * Delete saved filter
   */
  static async deleteSavedFilter(req: Request, res: Response): Promise<void> {
    try {
      const { filterId } = req.params;
      
      if (!req.user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!filterId) {
        res.status(400).json({
          error: 'Filter ID is required',
        });
        return;
      }

      const { sequelize } = require('../config/database');

      const result = await sequelize.query(
        'DELETE FROM saved_filters WHERE id = ? AND "userId" = ? RETURNING id',
        {
          replacements: [filterId, req.user.id],
          type: QueryTypes.SELECT,
        }
      );

      if (result.length === 0) {
        res.status(404).json({
          error: 'Filter not found or not owned by user',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Filter deleted successfully',
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to delete filter');
    }
  }

  /**
   * Get filter statistics
   */
  static async getFilterStats(req: Request, res: Response): Promise<void> {
    try {
      const { serviceType } = req.query;

      let whereCondition = '';
      const replacements: any[] = [];

      if (serviceType) {
        whereCondition = 'WHERE "serviceType" = ?';
        replacements.push(serviceType);
      }

      const { sequelize } = require('../config/database');

      const [presetStats, savedFilterStats] = await Promise.all([
        sequelize.query(
          `
          SELECT 
            "serviceType",
            COUNT(*) as total_presets,
            AVG("usageCount") as avg_usage
          FROM filter_presets
          ${whereCondition}
          GROUP BY "serviceType"
          ORDER BY total_presets DESC
          `,
          {
            replacements,
            type: QueryTypes.SELECT,
          }
        ),
        sequelize.query(
          `
          SELECT 
            "serviceType",
            COUNT(*) as total_saved,
            COUNT(*) FILTER (WHERE "isDefault" = true) as default_filters
          FROM saved_filters
          ${whereCondition}
          GROUP BY "serviceType"
          ORDER BY total_saved DESC
          `,
          {
            replacements,
            type: QueryTypes.SELECT,
          }
        ),
      ]);

      res.json({
        success: true,
        data: {
          presets: presetStats,
          savedFilters: savedFilterStats,
        },
      });
    } catch (error) {
      handleControllerError(error, res, 'Failed to get filter statistics');
    }
  }
}
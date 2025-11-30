import { Request, Response } from 'express';
import { UnifiedListingsService } from '../services/UnifiedListingsService';
import { SearchParams } from '../types/api-providers.types';
import { ServiceType, UnifiedListing, ListingStatus, ListingSource } from '../models/UnifiedListing';
import { logger } from '../utils/logger';
import { validationResult } from 'express-validator';

export class UnifiedListingsController {
  private static listingsService = UnifiedListingsService.getInstance();

  // Search combined listings (local + API)
  static async searchListings(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        serviceType,
        city,
        country,
        lat,
        lng,
        radius,
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
        sortBy,
        sortOrder,
        minPrice,
        maxPrice,
        minRating,
        amenities,
        categories,
        instantConfirmation,
      } = req.query;

      const searchParams: SearchParams = {
        serviceType: serviceType as ServiceType,
        location: {
          city: city as string,
          country: country as string,
          lat: lat ? parseFloat(lat as string) : undefined,
          lng: lng ? parseFloat(lng as string) : undefined,
          radius: radius ? parseInt(radius as string) : undefined,
        },
        dateRange: startDate && endDate ? {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
        } : undefined,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        filters: {
          minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
          minRating: minRating ? parseFloat(minRating as string) : undefined,
          amenities: amenities ? (amenities as string).split(',') : undefined,
          categories: categories ? (categories as string).split(',') : undefined,
          instantConfirmation: instantConfirmation === 'true',
        },
      };

      const results = await UnifiedListingsController.listingsService.searchCombinedListings(searchParams);

      // Track listing views
      const listingIds = results.items.map(item => item.id);
      UnifiedListingsController.trackViews(listingIds);

      res.json(results);
    } catch (error) {
      logger.error('Error searching listings:', error);
      res.status(500).json({ error: 'Failed to search listings' });
    }
  }

  // Get listing details
  static async getListingDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if it's a local listing
      const listing = await UnifiedListing.findByPk(id);
      
      if (listing) {
        // Increment view count
        await listing.incrementViewCount();
        
        return res.json({
          ...listing.toJSON(),
          isLocal: true,
        });
      }

      // If not local, parse the ID to determine the source
      const [source, externalId] = id.split('_');
      
      // For API listings, we might need to fetch fresh data
      // This would require implementing a getDetails method in providers
      return res.status(404).json({ error: 'Listing not found' });
    } catch (error) {
      logger.error('Error getting listing details:', error);
      res.status(500).json({ error: 'Failed to get listing details' });
    }
  }

  // Track click/booking
  static async trackListingAction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { action } = req.body; // 'click' or 'booking'

      const listing = await UnifiedListing.findByPk(id);
      
      if (listing) {
        if (action === 'click') {
          await listing.incrementClickCount();
        } else if (action === 'booking') {
          await listing.incrementBookingCount();
        }
        
        // Recalculate score after engagement
        listing.calculateScore();
        await listing.save();
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Error tracking listing action:', error);
      res.status(500).json({ error: 'Failed to track action' });
    }
  }

  // Create local listing (for users/partners)
  static async createListing(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const listing = await UnifiedListing.create({
        ...req.body,
        userId: req.user.id,
        source: ListingSource.LOCAL,
        status: ListingStatus.PENDING, // Require admin approval
      });

      res.status(201).json(listing);
    } catch (error) {
      logger.error('Error creating listing:', error);
      res.status(500).json({ error: 'Failed to create listing' });
    }
  }

  // Update local listing
  static async updateListing(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const listing = await UnifiedListing.findByPk(id);

      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      // Check ownership
      if (listing.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await listing.update(req.body);
      
      // Recalculate score
      listing.calculateScore();
      await listing.save();

      // Clear cache
      await UnifiedListingsController.listingsService.syncLocalListing(id);

      res.json(listing);
    } catch (error) {
      logger.error('Error updating listing:', error);
      res.status(500).json({ error: 'Failed to update listing' });
    }
  }

  // Delete local listing
  static async deleteListing(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { id } = req.params;
      const listing = await UnifiedListing.findByPk(id);

      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      // Check ownership
      if (listing.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Soft delete by changing status
      await listing.update({ status: ListingStatus.INACTIVE });

      res.json({ success: true });
    } catch (error) {
      logger.error('Error deleting listing:', error);
      res.status(500).json({ error: 'Failed to delete listing' });
    }
  }

  // Admin: Get provider status
  static async getProviderStatus(req: Request, res: Response) {
    try {
      const status = await UnifiedListingsController.listingsService.getProviderStatus();
      res.json(status);
    } catch (error) {
      logger.error('Error getting provider status:', error);
      res.status(500).json({ error: 'Failed to get provider status' });
    }
  }

  // Admin: Toggle provider
  static async toggleProvider(req: Request, res: Response) {
    try {
      const { source } = req.params;
      const { enabled } = req.body;

      await UnifiedListingsController.listingsService.toggleProvider(
        source as ListingSource,
        enabled
      );

      res.json({ success: true });
    } catch (error) {
      logger.error('Error toggling provider:', error);
      res.status(500).json({ error: 'Failed to toggle provider' });
    }
  }

  // Admin: Approve/reject listing
  static async moderateListing(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const listing = await UnifiedListing.findByPk(id);
      
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      await listing.update({ 
        status: status as ListingStatus,
        metadata: {
          ...listing.metadata,
          moderationReason: reason,
          moderatedAt: new Date(),
          moderatedBy: req.user!.id,
        },
      });

      res.json(listing);
    } catch (error) {
      logger.error('Error moderating listing:', error);
      res.status(500).json({ error: 'Failed to moderate listing' });
    }
  }

  // Admin: Feature/unfeature listing
  static async featureListing(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { featured } = req.body;

      const listing = await UnifiedListing.findByPk(id);
      
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      await listing.update({ isFeatured: featured });
      
      // Recalculate score
      listing.calculateScore();
      await listing.save();

      res.json(listing);
    } catch (error) {
      logger.error('Error featuring listing:', error);
      res.status(500).json({ error: 'Failed to feature listing' });
    }
  }

  // Helper: Track views in background
  private static async trackViews(listingIds: string[]) {
    try {
      const localIds = listingIds.filter(id => !id.includes('_'));
      
      if (localIds.length > 0) {
        await UnifiedListing.increment('viewCount', {
          where: { id: localIds },
        });
      }
    } catch (error) {
      logger.error('Error tracking views:', error);
    }
  }
}
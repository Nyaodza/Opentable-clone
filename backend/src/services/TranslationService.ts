// import { Translate } from '@google-cloud/translate/build/src/v2';
import axios from 'axios';
import { QueryTypes } from 'sequelize';
import { CacheManager } from '../config/redis';
import { sequelize } from '../config/database';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface TranslationOptions {
  sourceLanguage?: string;
  targetLanguage: string;
  provider?: 'google' | 'deepl' | 'azure' | 'aws';
  useCache?: boolean;
  quality?: 'standard' | 'premium';
}

export interface TranslatedContent {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
  confidence?: number;
  isAutoTranslated: boolean;
  cost?: number;
}

export interface ListingTranslation {
  listingId: string;
  language: string;
  title: string;
  description?: string;
  highlights?: string[];
  included?: string[];
  excluded?: string[];
  requirements?: string[];
  cancellationPolicyText?: string;
  additionalInfo?: Record<string, any>;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  isActive: boolean;
  isDefault: boolean;
  translationProgress: number;
  locale?: string;
  flag?: string;
}

export class TranslationService extends EventEmitter {
  private static instance: TranslationService;
  private cache: CacheManager;
  private googleTranslate?: any;
  private translationProviders: Map<string, any>;
  private readonly BATCH_SIZE = 100;
  private readonly CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

  private constructor() {
    super();
    this.cache = CacheManager.getInstance();
    this.translationProviders = new Map();
    this.initializeProviders();
  }

  static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  /**
   * Initialize translation providers
   */
  private initializeProviders(): void {
    // Google Translate
    if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      // this.googleTranslate = new Translate({
      //   key: process.env.GOOGLE_TRANSLATE_API_KEY,
      // });
      // this.translationProviders.set('google', this.googleTranslate);
    }

    // Add other providers as needed
    // DeepL, Azure Translator, AWS Translate, etc.
  }

  /**
   * Translate text
   */
  async translateText(
    text: string,
    options: TranslationOptions
  ): Promise<TranslatedContent> {
    try {
      // Check cache first
      if (options.useCache !== false) {
        const cached = await this.getCachedTranslation(
          text,
          options.sourceLanguage || 'auto',
          options.targetLanguage
        );
        
        if (cached) {
          await this.updateCacheUsage(cached.id);
          return cached;
        }
      }

      // Perform translation
      const provider = options.provider || this.getDefaultProvider();
      const result = await this.performTranslation(text, options, provider);

      // Cache the result
      if (options.useCache !== false) {
        await this.cacheTranslation(result);
      }

      // Track usage for billing
      await this.trackTranslationUsage(result);

      return result;
    } catch (error) {
      logger.error('Translation error:', error);
      throw error;
    }
  }

  /**
   * Translate listing content
   */
  async translateListing(
    listingId: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<ListingTranslation> {
    try {
      // Check if translation already exists
      const existing = await this.getListingTranslation(listingId, targetLanguage);
      if (existing && !existing.isAutoTranslated) {
        return existing;
      }

      // Get original listing
      const listing = await this.getListingContent(listingId);
      if (!listing) {
        throw new Error('Listing not found');
      }

      const sourceLang = sourceLanguage || listing.originalLanguage || 'en';

      // Translate fields
      const [
        title,
        description,
        highlights,
        included,
        excluded,
        requirements,
        cancellationPolicy,
      ] = await Promise.all([
        this.translateText(listing.title, {
          sourceLanguage: sourceLang,
          targetLanguage,
        }),
        listing.description ? this.translateText(listing.description, {
          sourceLanguage: sourceLang,
          targetLanguage,
        }) : null,
        this.translateArray(listing.highlights || [], {
          sourceLanguage: sourceLang,
          targetLanguage,
        }),
        this.translateArray(listing.included || [], {
          sourceLanguage: sourceLang,
          targetLanguage,
        }),
        this.translateArray(listing.excluded || [], {
          sourceLanguage: sourceLang,
          targetLanguage,
        }),
        this.translateArray(listing.requirements || [], {
          sourceLanguage: sourceLang,
          targetLanguage,
        }),
        listing.cancellationPolicyText ? this.translateText(listing.cancellationPolicyText, {
          sourceLanguage: sourceLang,
          targetLanguage,
        }) : null,
      ]);

      const translation: ListingTranslation = {
        listingId,
        language: targetLanguage,
        title: title.text,
        description: description?.text,
        highlights,
        included,
        excluded,
        requirements,
        cancellationPolicyText: cancellationPolicy?.text,
      };

      // Save translation
      await this.saveListingTranslation(translation, true);

      // Update listing available languages
      await this.updateListingLanguages(listingId, targetLanguage);

      this.emit('listingTranslated', {
        listingId,
        language: targetLanguage,
        fields: Object.keys(translation).length,
      });

      return translation;
    } catch (error) {
      logger.error('Error translating listing:', error);
      throw error;
    }
  }

  /**
   * Batch translate listings
   */
  async batchTranslateListings(
    listingIds: string[],
    targetLanguages: string[]
  ): Promise<Map<string, Map<string, ListingTranslation>>> {
    try {
      const results = new Map<string, Map<string, ListingTranslation>>();
      const totalOperations = listingIds.length * targetLanguages.length;
      let completed = 0;

      // Process in batches
      for (let i = 0; i < listingIds.length; i += this.BATCH_SIZE) {
        const batch = listingIds.slice(i, i + this.BATCH_SIZE);
        
        await Promise.all(
          batch.map(async (listingId) => {
            const listingTranslations = new Map<string, ListingTranslation>();
            
            for (const language of targetLanguages) {
              try {
                const translation = await this.translateListing(listingId, language);
                listingTranslations.set(language, translation);
                completed++;
                
                this.emit('batchProgress', {
                  completed,
                  total: totalOperations,
                  percentage: (completed / totalOperations) * 100,
                });
              } catch (error) {
                logger.error(`Failed to translate listing ${listingId} to ${language}:`, error);
              }
            }
            
            results.set(listingId, listingTranslations);
          })
        );
      }

      return results;
    } catch (error) {
      logger.error('Error in batch translation:', error);
      throw error;
    }
  }

  /**
   * Get available languages
   */
  async getAvailableLanguages(activeOnly = true): Promise<SupportedLanguage[]> {
    try {
      const whereClause = activeOnly ? 'WHERE "isActive" = true' : '';
      
      const result = await sequelize.query(
        `
        SELECT * FROM supported_languages
        ${whereClause}
        ORDER BY "isDefault" DESC, name ASC
        `,
        {
          type: QueryTypes.SELECT,
        }
      );

      return result as SupportedLanguage[];
    } catch (error) {
      logger.error('Error getting available languages:', error);
      throw error;
    }
  }

  /**
   * Get user language preference
   */
  async getUserLanguagePreference(userId: string): Promise<{
    preferredLanguage: string;
    fallbackLanguages: string[];
    autoTranslate: boolean;
    showOriginalText: boolean;
    preferredCurrency: string;
    preferredUnits: 'metric' | 'imperial';
    dateFormat: string;
    timeFormat: '12h' | '24h';
  } | null> {
    try {
      const result = await sequelize.query(
        `
        SELECT * FROM user_language_preferences
        WHERE "userId" = ?
        `,
        {
          replacements: [userId],
          type: QueryTypes.SELECT,
        }
      );

      if (result.length === 0) {
        return null;
      }

      return result[0] as any;
    } catch (error) {
      logger.error('Error getting user language preference:', error);
      return null;
    }
  }

  /**
   * Set user language preference
   */
  async setUserLanguagePreference(
    userId: string,
    preferences: {
      preferredLanguage: string;
      fallbackLanguages?: string[];
      autoTranslate?: boolean;
      showOriginalText?: boolean;
      preferredCurrency?: string;
      preferredUnits?: 'metric' | 'imperial';
      dateFormat?: string;
      timeFormat?: '12h' | '24h';
    }
  ): Promise<void> {
    try {
      await sequelize.query(
        `
        INSERT INTO user_language_preferences (
          id, "userId", "preferredLanguage", "fallbackLanguages",
          "autoTranslate", "showOriginalText", "preferredCurrency",
          "preferredUnits", "dateFormat", "timeFormat", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON CONFLICT ("userId") DO UPDATE SET
          "preferredLanguage" = EXCLUDED."preferredLanguage",
          "fallbackLanguages" = EXCLUDED."fallbackLanguages",
          "autoTranslate" = EXCLUDED."autoTranslate",
          "showOriginalText" = EXCLUDED."showOriginalText",
          "preferredCurrency" = EXCLUDED."preferredCurrency",
          "preferredUnits" = EXCLUDED."preferredUnits",
          "dateFormat" = EXCLUDED."dateFormat",
          "timeFormat" = EXCLUDED."timeFormat",
          "updatedAt" = NOW()
        `,
        {
          replacements: [
            require('crypto').randomUUID(),
            userId,
            preferences.preferredLanguage,
            preferences.fallbackLanguages || ['en'],
            preferences.autoTranslate !== false,
            preferences.showOriginalText || false,
            preferences.preferredCurrency || 'USD',
            preferences.preferredUnits || 'metric',
            preferences.dateFormat || 'YYYY-MM-DD',
            preferences.timeFormat || '24h',
          ],
        }
      );

      // Clear cache
      await this.cache.del(`user_lang_pref:${userId}`);
    } catch (error) {
      logger.error('Error setting user language preference:', error);
      throw error;
    }
  }

  /**
   * Translate amenities
   */
  async translateAmenities(
    amenities: string[],
    targetLanguage: string,
    context?: string
  ): Promise<string[]> {
    try {
      const translations: string[] = [];

      for (const amenity of amenities) {
        // Check for existing translation
        const existing = await sequelize.query(
          `
          SELECT translation FROM amenity_translations
          WHERE "amenityKey" = ? AND language = ? 
          ${context ? 'AND context = ?' : ''}
          `,
          {
            replacements: context ? [amenity, targetLanguage, context] : [amenity, targetLanguage],
            type: QueryTypes.SELECT,
          }
        );

        if (existing.length > 0) {
          translations.push((existing[0] as any).translation);
        } else {
          // Translate and store
          const translated = await this.translateText(amenity, {
            targetLanguage,
            sourceLanguage: 'en',
          });

          await sequelize.query(
            `
            INSERT INTO amenity_translations (
              id, "amenityKey", language, translation, context, "createdAt", "updatedAt"
            ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
            `,
            {
              replacements: [
                require('crypto').randomUUID(),
                amenity,
                targetLanguage,
                translated.text,
                context || null,
              ],
            }
          );

          translations.push(translated.text);
        }
      }

      return translations;
    } catch (error) {
      logger.error('Error translating amenities:', error);
      return amenities; // Return original if translation fails
    }
  }

  /**
   * Get translation statistics
   */
  async getTranslationStats(): Promise<{
    totalTranslations: number;
    totalCharacters: number;
    totalCost: number;
    byLanguage: Record<string, number>;
    byProvider: Record<string, number>;
    cacheHitRate: number;
    avgConfidence: number;
  }> {
    try {
      const stats = await sequelize.query(
        `
        SELECT 
          COUNT(*) as total_translations,
          SUM("characterCount") as total_characters,
          SUM(cost) as total_cost,
          AVG(confidence) as avg_confidence,
          json_object_agg("targetLanguage", lang_count) as by_language,
          json_object_agg(provider, provider_count) as by_provider
        FROM (
          SELECT 
            "targetLanguage",
            provider,
            "characterCount",
            cost,
            confidence,
            COUNT(*) OVER (PARTITION BY "targetLanguage") as lang_count,
            COUNT(*) OVER (PARTITION BY provider) as provider_count
          FROM translation_cache
        ) subquery
        `,
        {
          type: QueryTypes.SELECT,
        }
      );

      const result = stats[0] as any;

      // Calculate cache hit rate
      const cacheHits = await sequelize.query(
        'SELECT SUM("usageCount") - COUNT(*) as cache_hits FROM translation_cache',
        { type: QueryTypes.SELECT }
      );

      const totalRequests = parseInt(result.total_translations) + parseInt((cacheHits[0] as any).cache_hits || 0);
      const cacheHitRate = totalRequests > 0 ? (parseInt((cacheHits[0] as any).cache_hits || 0) / totalRequests) * 100 : 0;

      return {
        totalTranslations: parseInt(result.total_translations),
        totalCharacters: parseInt(result.total_characters),
        totalCost: parseFloat(result.total_cost),
        byLanguage: result.by_language || {},
        byProvider: result.by_provider || {},
        cacheHitRate,
        avgConfidence: parseFloat(result.avg_confidence) || 0,
      };
    } catch (error) {
      logger.error('Error getting translation stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old cache entries
   */
  async cleanupTranslationCache(olderThanDays = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await sequelize.query(
        `
        DELETE FROM translation_cache
        WHERE "lastUsed" < ?
          AND "usageCount" < 5
        RETURNING id
        `,
        {
          replacements: [cutoffDate],
          type: QueryTypes.SELECT,
        }
      );

      const deletedCount = result.length;
      logger.info(`Cleaned up ${deletedCount} old translation cache entries`);
      
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up translation cache:', error);
      throw error;
    }
  }

  /**
   * Perform translation using selected provider
   */
  private async performTranslation(
    text: string,
    options: TranslationOptions,
    provider: string
  ): Promise<TranslatedContent> {
    switch (provider) {
      case 'google':
        return await this.translateWithGoogle(text, options);
      case 'deepl':
        return await this.translateWithDeepL(text, options);
      case 'azure':
        return await this.translateWithAzure(text, options);
      case 'aws':
        return await this.translateWithAWS(text, options);
      default:
        throw new Error(`Unsupported translation provider: ${provider}`);
    }
  }

  /**
   * Translate with Google Translate
   */
  private async translateWithGoogle(
    text: string,
    options: TranslationOptions
  ): Promise<TranslatedContent> {
    if (!this.googleTranslate) {
      throw new Error('Google Translate not configured');
    }

    const [translation] = await this.googleTranslate.translate(text, {
      from: options.sourceLanguage || 'auto',
      to: options.targetLanguage,
    });

    const detectedLanguage = options.sourceLanguage || 'en'; // Google returns detected language separately

    return {
      text: translation,
      sourceLanguage: detectedLanguage,
      targetLanguage: options.targetLanguage,
      provider: 'google',
      isAutoTranslated: true,
      cost: this.calculateCost(text.length, 'google'),
    };
  }

  /**
   * Translate with DeepL (placeholder)
   */
  private async translateWithDeepL(
    text: string,
    options: TranslationOptions
  ): Promise<TranslatedContent> {
    // Implementation would go here
    throw new Error('DeepL translation not implemented');
  }

  /**
   * Translate with Azure (placeholder)
   */
  private async translateWithAzure(
    text: string,
    options: TranslationOptions
  ): Promise<TranslatedContent> {
    // Implementation would go here
    throw new Error('Azure translation not implemented');
  }

  /**
   * Translate with AWS (placeholder)
   */
  private async translateWithAWS(
    text: string,
    options: TranslationOptions
  ): Promise<TranslatedContent> {
    // Implementation would go here
    throw new Error('AWS translation not implemented');
  }

  /**
   * Get default translation provider
   */
  private getDefaultProvider(): string {
    if (this.googleTranslate) return 'google';
    // Add other providers in order of preference
    throw new Error('No translation provider configured');
  }

  /**
   * Calculate translation cost
   */
  private calculateCost(characterCount: number, provider: string): number {
    const rates: Record<string, number> = {
      google: 0.00002, // $20 per million characters
      deepl: 0.000025, // $25 per million characters
      azure: 0.00001, // $10 per million characters
      aws: 0.000015, // $15 per million characters
    };

    return characterCount * (rates[provider] || 0);
  }

  /**
   * Get cached translation
   */
  private async getCachedTranslation(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<any> {
    try {
      const result = await sequelize.query(
        `
        SELECT * FROM translation_cache
        WHERE "sourceText" = ? 
          AND "sourceLanguage" = ? 
          AND "targetLanguage" = ?
        `,
        {
          replacements: [sourceText, sourceLanguage, targetLanguage],
          type: QueryTypes.SELECT,
        }
      );

      if (result.length > 0) {
        const cached = result[0] as any;
        return {
          text: cached.translatedText,
          sourceLanguage: cached.sourceLanguage,
          targetLanguage: cached.targetLanguage,
          provider: cached.provider,
          confidence: cached.confidence,
          isAutoTranslated: true,
          id: cached.id,
        };
      }

      return null;
    } catch (error) {
      logger.error('Error getting cached translation:', error);
      return null;
    }
  }

  /**
   * Cache translation
   */
  private async cacheTranslation(translation: TranslatedContent): Promise<void> {
    try {
      await sequelize.query(
        `
        INSERT INTO translation_cache (
          id, "sourceText", "sourceLanguage", "targetLanguage",
          "translatedText", provider, confidence, cost,
          "characterCount", "createdAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON CONFLICT ("sourceText", "sourceLanguage", "targetLanguage") DO UPDATE SET
          "lastUsed" = NOW(),
          "usageCount" = translation_cache."usageCount" + 1
        `,
        {
          replacements: [
            require('crypto').randomUUID(),
            translation.text,
            translation.sourceLanguage,
            translation.targetLanguage,
            translation.text,
            translation.provider,
            translation.confidence || null,
            translation.cost || 0,
            translation.text.length,
          ],
        }
      );
    } catch (error) {
      logger.error('Error caching translation:', error);
    }
  }

  /**
   * Update cache usage
   */
  private async updateCacheUsage(cacheId: string): Promise<void> {
    try {
      await sequelize.query(
        `
        UPDATE translation_cache 
        SET "usageCount" = "usageCount" + 1, "lastUsed" = NOW()
        WHERE id = ?
        `,
        {
          replacements: [cacheId],
        }
      );
    } catch (error) {
      logger.error('Error updating cache usage:', error);
    }
  }

  /**
   * Track translation usage
   */
  private async trackTranslationUsage(translation: TranslatedContent): Promise<void> {
    try {
      const key = `translation_usage:${new Date().toISOString().split('T')[0]}`;
      const usage = await this.cache.get(key) || {
        total: 0,
        byProvider: {},
        byLanguage: {},
        totalCost: 0,
      };

      usage.total++;
      usage.byProvider[translation.provider] = (usage.byProvider[translation.provider] || 0) + 1;
      usage.byLanguage[translation.targetLanguage] = (usage.byLanguage[translation.targetLanguage] || 0) + 1;
      usage.totalCost += translation.cost || 0;

      await this.cache.set(key, usage, 86400); // 24 hours
    } catch (error) {
      logger.error('Error tracking translation usage:', error);
    }
  }

  /**
   * Translate array of strings
   */
  private async translateArray(
    items: string[],
    options: TranslationOptions
  ): Promise<string[]> {
    if (items.length === 0) return [];

    const translations = await Promise.all(
      items.map(item => this.translateText(item, options))
    );

    return translations.map(t => t.text);
  }

  /**
   * Get listing content
   */
  private async getListingContent(listingId: string): Promise<any> {
    const result = await sequelize.query(
      `
      SELECT * FROM unified_listings
      WHERE id = ?
      `,
      {
        replacements: [listingId],
        type: QueryTypes.SELECT,
      }
    );

    return result[0];
  }

  /**
   * Get listing translation
   */
  private async getListingTranslation(
    listingId: string,
    language: string
  ): Promise<any> {
    const result = await sequelize.query(
      `
      SELECT * FROM listing_translations
      WHERE "listingId" = ? AND language = ?
      `,
      {
        replacements: [listingId, language],
        type: QueryTypes.SELECT,
      }
    );

    return result[0];
  }

  /**
   * Save listing translation
   */
  private async saveListingTranslation(
    translation: ListingTranslation,
    isAutoTranslated: boolean
  ): Promise<void> {
    await sequelize.query(
      `
      INSERT INTO listing_translations (
        id, "listingId", language, title, description, highlights,
        included, excluded, requirements, "cancellationPolicyText",
        "additionalInfo", "isAutoTranslated", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON CONFLICT ("listingId", language) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        highlights = EXCLUDED.highlights,
        included = EXCLUDED.included,
        excluded = EXCLUDED.excluded,
        requirements = EXCLUDED.requirements,
        "cancellationPolicyText" = EXCLUDED."cancellationPolicyText",
        "additionalInfo" = EXCLUDED."additionalInfo",
        "isAutoTranslated" = EXCLUDED."isAutoTranslated",
        "updatedAt" = NOW()
      `,
      {
        replacements: [
          require('crypto').randomUUID(),
          translation.listingId,
          translation.language,
          translation.title,
          translation.description || null,
          translation.highlights || [],
          translation.included || [],
          translation.excluded || [],
          translation.requirements || [],
          translation.cancellationPolicyText || null,
          JSON.stringify(translation.additionalInfo || {}),
          isAutoTranslated,
        ],
      }
    );
  }

  /**
   * Update listing available languages
   */
  private async updateListingLanguages(
    listingId: string,
    newLanguage: string
  ): Promise<void> {
    await sequelize.query(
      `
      UPDATE unified_listings
      SET "availableLanguages" = array_append(
        COALESCE("availableLanguages", ARRAY['en']), 
        ?
      )
      WHERE id = ? 
        AND NOT (? = ANY("availableLanguages"))
      `,
      {
        replacements: [newLanguage, listingId, newLanguage],
      }
    );
  }
}
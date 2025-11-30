import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { I18nController } from '../controllers/i18n.controller';

const router = Router();

// Validation middleware
const translateTextValidation = [
  body('text')
    .isString()
    .notEmpty()
    .withMessage('Text is required'),
  body('targetLanguage')
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Target language must be a valid language code'),
  body('sourceLanguage')
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Source language must be a valid language code'),
  body('provider')
    .optional()
    .isIn(['google', 'deepl', 'azure', 'aws'])
    .withMessage('Invalid translation provider'),
  body('quality')
    .optional()
    .isIn(['standard', 'premium'])
    .withMessage('Quality must be standard or premium'),
];

const translateListingValidation = [
  param('listingId')
    .isString()
    .notEmpty()
    .withMessage('Listing ID is required'),
  body('targetLanguage')
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Target language must be a valid language code'),
  body('sourceLanguage')
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Source language must be a valid language code'),
];

const batchTranslateValidation = [
  body('listingIds')
    .isArray({ min: 1 })
    .withMessage('Listing IDs array is required'),
  body('listingIds.*')
    .isString()
    .notEmpty()
    .withMessage('Each listing ID must be a non-empty string'),
  body('targetLanguages')
    .isArray({ min: 1 })
    .withMessage('Target languages array is required'),
  body('targetLanguages.*')
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Each target language must be a valid language code'),
];

const userPreferencesValidation = [
  body('preferredLanguage')
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Preferred language must be a valid language code'),
  body('fallbackLanguages')
    .optional()
    .isArray()
    .withMessage('Fallback languages must be an array'),
  body('fallbackLanguages.*')
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Each fallback language must be a valid language code'),
  body('autoTranslate')
    .optional()
    .isBoolean()
    .withMessage('Auto translate must be a boolean'),
  body('showOriginalText')
    .optional()
    .isBoolean()
    .withMessage('Show original text must be a boolean'),
  body('preferredCurrency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Preferred currency must be a 3-letter code'),
  body('preferredUnits')
    .optional()
    .isIn(['metric', 'imperial'])
    .withMessage('Preferred units must be metric or imperial'),
  body('dateFormat')
    .optional()
    .isString()
    .withMessage('Date format must be a string'),
  body('timeFormat')
    .optional()
    .isIn(['12h', '24h'])
    .withMessage('Time format must be 12h or 24h'),
];

const translateAmenitiesValidation = [
  body('amenities')
    .isArray({ min: 1 })
    .withMessage('Amenities array is required'),
  body('amenities.*')
    .isString()
    .notEmpty()
    .withMessage('Each amenity must be a non-empty string'),
  body('targetLanguage')
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Target language must be a valid language code'),
  body('context')
    .optional()
    .isString()
    .withMessage('Context must be a string'),
];

const addTranslationValidation = [
  body('type')
    .isIn(['amenity', 'category', 'location'])
    .withMessage('Type must be amenity, category, or location'),
  body('key')
    .isString()
    .notEmpty()
    .withMessage('Key is required'),
  body('language')
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language must be a valid language code'),
  body('translation')
    .isString()
    .notEmpty()
    .withMessage('Translation is required'),
  body('context')
    .optional()
    .isString()
    .withMessage('Context must be a string'),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be a string'),
];

const listingIdValidation = [
  param('listingId')
    .isString()
    .notEmpty()
    .withMessage('Listing ID is required'),
];

const languageQueryValidation = [
  query('language')
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language must be a valid language code'),
];

// Language routes
router.get(
  '/languages',
  query('activeOnly')
    .optional()
    .isBoolean()
    .withMessage('Active only must be a boolean'),
  I18nController.getAvailableLanguages
);

// Translation routes
router.post(
  '/translate',
  translateTextValidation,
  I18nController.translateText
);

router.post(
  '/translate/listing/:listingId',
  translateListingValidation,
  I18nController.translateListing
);

router.get(
  '/translate/listing/:listingId',
  listingIdValidation,
  languageQueryValidation,
  I18nController.getListingTranslations
);

router.post(
  '/translate/batch',
  batchTranslateValidation,
  I18nController.batchTranslateListings
);

router.post(
  '/translate/amenities',
  translateAmenitiesValidation,
  I18nController.translateAmenities
);

// User preferences routes
router.get(
  '/preferences',
  I18nController.getUserLanguagePreferences
);

router.put(
  '/preferences',
  userPreferencesValidation,
  I18nController.setUserLanguagePreferences
);

// Translation data routes
router.get(
  '/translations/amenities',
  query('context')
    .optional()
    .isString()
    .withMessage('Context must be a string'),
  languageQueryValidation,
  I18nController.getAmenityTranslations
);

router.get(
  '/translations/categories',
  languageQueryValidation,
  I18nController.getCategoryTranslations
);

router.get(
  '/translations/locations',
  query('locationType')
    .optional()
    .isIn(['country', 'state', 'city', 'region', 'neighborhood', 'landmark'])
    .withMessage('Invalid location type'),
  languageQueryValidation,
  I18nController.getLocationTranslations
);

// Statistics routes
router.get(
  '/stats',
  I18nController.getTranslationStats
);

// Admin routes
router.post(
  '/translations',
  addTranslationValidation,
  I18nController.addTranslation
);

router.delete(
  '/cache/cleanup',
  query('olderThanDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Older than days must be a positive integer'),
  I18nController.cleanupTranslationCache
);

export default router;
/**
 * SEO Components Index
 * Exports all SEO-related components for structured data and meta tags
 */

// Base structured data components
export {
  OrganizationStructuredData,
  WebsiteStructuredData,
  RestaurantStructuredData,
  ReviewStructuredData,
  LocalBusinessStructuredData,
  BreadcrumbStructuredData,
} from './structured-data';

// Extended restaurant structured data with more features
export {
  RestaurantStructuredData as RestaurantSchemaData,
  BreadcrumbStructuredData as BreadcrumbSchemaData,
  ReviewStructuredData as ReviewSchemaData,
  FAQStructuredData,
  EventStructuredData,
  MenuStructuredData,
  SearchActionStructuredData,
  ReservationStructuredData,
} from './restaurant-structured-data';

// Types
export type {
  RestaurantStructuredDataProps,
  BreadcrumbStructuredDataProps,
  ReviewStructuredDataProps,
  FAQStructuredDataProps,
  EventStructuredDataProps,
  MenuStructuredDataProps,
  ReservationStructuredDataProps,
} from './restaurant-structured-data';

// SEO Head component
export { default as SEOHead } from './SEOHead';


import { ServiceType, ListingSource } from '../../models/UnifiedListing';
import { ApiProvider, ServiceTypeProviders, ApiProviderConfig } from '../../types/api-providers.types';
import { ViatorProvider } from './activities/ViatorProvider';
import { GetYourGuideProvider } from './activities/GetYourGuideProvider';
import { BookingProvider } from './hotels/BookingProvider';
import { ExpediaProvider } from './hotels/ExpediaProvider';

export class ApiProviderFactory {
  private static getProviderConfig(source: ListingSource): ApiProviderConfig {
    // In production, these would come from environment variables or database
    const configs: Record<ListingSource, Partial<ApiProviderConfig>> = {
      [ListingSource.LOCAL]: {
        name: 'Local Database',
        enabled: true,
      },
      [ListingSource.VIATOR]: {
        name: 'Viator',
        source: ListingSource.VIATOR,
        enabled: process.env.VIATOR_ENABLED === 'true',
        apiKey: process.env.VIATOR_API_KEY,
        baseUrl: 'https://api.viator.com/partner',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 600, // 10 minutes
        rateLimit: {
          maxRequests: 100,
          windowMs: 60000, // 1 minute
        },
      },
      [ListingSource.GETYOURGUIDE]: {
        name: 'GetYourGuide',
        source: ListingSource.GETYOURGUIDE,
        enabled: process.env.GETYOURGUIDE_ENABLED === 'true',
        apiKey: process.env.GETYOURGUIDE_API_KEY,
        baseUrl: 'https://api.getyourguide.com/1',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 600,
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000,
        },
      },
      [ListingSource.TRAVELPAYOUTS]: {
        name: 'Travelpayouts',
        source: ListingSource.TRAVELPAYOUTS,
        enabled: process.env.TRAVELPAYOUTS_ENABLED === 'true',
        apiKey: process.env.TRAVELPAYOUTS_TOKEN,
        baseUrl: 'https://api.travelpayouts.com/v2',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 600,
        rateLimit: {
          maxRequests: 200,
          windowMs: 60000,
        },
      },
      [ListingSource.BOOKING]: {
        name: 'Booking.com',
        source: ListingSource.BOOKING,
        enabled: process.env.BOOKING_ENABLED === 'true',
        apiKey: process.env.BOOKING_API_KEY,
        apiSecret: process.env.BOOKING_API_SECRET,
        baseUrl: 'https://api.booking.com/api',
        maxListingsPerRequest: 4,
        timeout: 15000,
        retryAttempts: 3,
        cacheTTL: 900, // 15 minutes
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000,
        },
      },
      [ListingSource.EXPEDIA]: {
        name: 'Expedia',
        source: ListingSource.EXPEDIA,
        enabled: process.env.EXPEDIA_ENABLED === 'true',
        apiKey: process.env.EXPEDIA_API_KEY,
        apiSecret: process.env.EXPEDIA_API_SECRET,
        baseUrl: 'https://api.ean.com/v3',
        maxListingsPerRequest: 4,
        timeout: 15000,
        retryAttempts: 3,
        cacheTTL: 900,
        rateLimit: {
          maxRequests: 100,
          windowMs: 60000,
        },
      },
      [ListingSource.KIWI]: {
        name: 'Kiwi.com',
        source: ListingSource.KIWI,
        enabled: process.env.KIWI_ENABLED === 'true',
        apiKey: process.env.KIWI_API_KEY,
        baseUrl: 'https://api.tequila.kiwi.com',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 300, // 5 minutes for flights
        rateLimit: {
          maxRequests: 100,
          windowMs: 60000,
        },
      },
      [ListingSource.DISCOVERCARS]: {
        name: 'DiscoverCars',
        source: ListingSource.DISCOVERCARS,
        enabled: process.env.DISCOVERCARS_ENABLED === 'true',
        apiKey: process.env.DISCOVERCARS_API_KEY,
        baseUrl: 'https://api.discovercars.com/api/v1',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 600,
        rateLimit: {
          maxRequests: 60,
          windowMs: 60000,
        },
      },
      [ListingSource.RENTALCARS]: {
        name: 'Rentalcars.com',
        source: ListingSource.RENTALCARS,
        enabled: process.env.RENTALCARS_ENABLED === 'true',
        apiKey: process.env.RENTALCARS_API_KEY,
        baseUrl: 'https://api.rentalcars.com',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 600,
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000,
        },
      },
      [ListingSource.CRUISEDIRECT]: {
        name: 'CruiseDirect',
        source: ListingSource.CRUISEDIRECT,
        enabled: process.env.CRUISEDIRECT_ENABLED === 'true',
        apiKey: process.env.CRUISEDIRECT_API_KEY,
        baseUrl: 'https://api.cruisedirect.com',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 1800, // 30 minutes for cruises
        rateLimit: {
          maxRequests: 30,
          windowMs: 60000,
        },
      },
      [ListingSource.GOTOSEA]: {
        name: 'GoToSea',
        source: ListingSource.GOTOSEA,
        enabled: process.env.GOTOSEA_ENABLED === 'true',
        apiKey: process.env.GOTOSEA_API_KEY,
        baseUrl: 'https://api.gotosea.com',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 1800,
        rateLimit: {
          maxRequests: 40,
          windowMs: 60000,
        },
      },
      [ListingSource.EVENTBRITE]: {
        name: 'Eventbrite',
        source: ListingSource.EVENTBRITE,
        enabled: process.env.EVENTBRITE_ENABLED === 'true',
        apiKey: process.env.EVENTBRITE_PRIVATE_TOKEN,
        baseUrl: 'https://www.eventbriteapi.com/v3',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 600,
        rateLimit: {
          maxRequests: 100,
          windowMs: 60000,
        },
      },
      [ListingSource.TICKETMASTER]: {
        name: 'Ticketmaster',
        source: ListingSource.TICKETMASTER,
        enabled: process.env.TICKETMASTER_ENABLED === 'true',
        apiKey: process.env.TICKETMASTER_API_KEY,
        baseUrl: 'https://app.ticketmaster.com/discovery/v2',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 600,
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000,
        },
      },
      [ListingSource.SKYSCANNER]: {
        name: 'Skyscanner',
        source: ListingSource.SKYSCANNER,
        enabled: process.env.SKYSCANNER_ENABLED === 'true',
        apiKey: process.env.SKYSCANNER_API_KEY,
        baseUrl: 'https://partners.api.skyscanner.net/apiservices',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 300,
        rateLimit: {
          maxRequests: 60,
          windowMs: 60000,
        },
      },
      [ListingSource.OPENTABLE]: {
        name: 'OpenTable',
        source: ListingSource.OPENTABLE,
        enabled: process.env.OPENTABLE_ENABLED === 'true',
        apiKey: process.env.OPENTABLE_API_KEY,
        baseUrl: 'https://api.opentable.com',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 600,
        rateLimit: {
          maxRequests: 50,
          windowMs: 60000,
        },
      },
      [ListingSource.VRBO]: {
        name: 'Vrbo',
        source: ListingSource.VRBO,
        enabled: process.env.VRBO_ENABLED === 'true',
        apiKey: process.env.VRBO_API_KEY,
        baseUrl: 'https://api.vrbo.com',
        maxListingsPerRequest: 4,
        timeout: 10000,
        retryAttempts: 3,
        cacheTTL: 900,
        rateLimit: {
          maxRequests: 40,
          windowMs: 60000,
        },
      },
    };

    const config = configs[source];
    if (!config) {
      throw new Error(`No configuration found for provider: ${source}`);
    }
    
    // Ensure all required properties exist
    const fullConfig: ApiProviderConfig = {
      name: config.name || source,
      source,
      enabled: config.enabled || false,
      apiKey: config.apiKey || '',
      baseUrl: config.baseUrl || '',
      maxListingsPerRequest: config.maxListingsPerRequest || 4,
      timeout: config.timeout || 10000,
      retryAttempts: config.retryAttempts || 3,
      cacheTTL: config.cacheTTL || 600,
      rateLimit: config.rateLimit || {
        maxRequests: 50,
        windowMs: 60000,
      },
      ...config,
    };
    
    return fullConfig;
  }

  static createProviders(): ServiceTypeProviders {
    const providers: ServiceTypeProviders = {
      [ServiceType.ACTIVITIES]: [],
      [ServiceType.CAR_RENTALS]: [],
      [ServiceType.CRUISES]: [],
      [ServiceType.EVENTS]: [],
      [ServiceType.FLIGHTS]: [],
      [ServiceType.HOTELS]: [],
      [ServiceType.NIGHTLIFE]: [],
      [ServiceType.RESTAURANTS]: [],
      [ServiceType.TOURS]: [],
      [ServiceType.VACATION_RENTALS]: [],
    };

    // Activities providers
    const viatorConfig = this.getProviderConfig(ListingSource.VIATOR);
    if (viatorConfig?.enabled) {
      providers[ServiceType.ACTIVITIES].push(new ViatorProvider(viatorConfig));
    }

    const getYourGuideConfig = this.getProviderConfig(ListingSource.GETYOURGUIDE);
    if (getYourGuideConfig?.enabled) {
      providers[ServiceType.ACTIVITIES].push(new GetYourGuideProvider(getYourGuideConfig));
      providers[ServiceType.TOURS].push(new GetYourGuideProvider(getYourGuideConfig));
    }

    // Add Travelpayouts activities
    // const travelpayoutsConfig = this.getProviderConfig(ListingSource.TRAVELPAYOUTS);
    // if (travelpayoutsConfig?.enabled) {
    //   providers[ServiceType.ACTIVITIES].push(new TravelpayoutsActivitiesProvider(travelpayoutsConfig));
    // }

    // Car Rentals providers
    // if (this.getProviderConfig(ListingSource.DISCOVERCARS)?.enabled) {
    //   providers[ServiceType.CAR_RENTALS].push(new DiscoverCarsProvider(discoverCarsConfig));
    // }
    // Add RentalCars, Travelpayouts car rentals

    // Cruises providers
    // Add CruiseDirect, Expedia cruises, GoToSea

    // Events providers
    // Add Eventbrite, Ticketmaster, Travelpayouts events

    // Flights providers
    // Add Kiwi, Skyscanner, Travelpayouts flights

    // Hotels providers
    const bookingConfig = this.getProviderConfig(ListingSource.BOOKING);
    if (bookingConfig?.enabled) {
      providers[ServiceType.HOTELS].push(new BookingProvider(bookingConfig));
    }

    const expediaConfig = this.getProviderConfig(ListingSource.EXPEDIA);
    if (expediaConfig?.enabled) {
      providers[ServiceType.HOTELS].push(new ExpediaProvider(expediaConfig));
      providers[ServiceType.VACATION_RENTALS].push(new ExpediaProvider(expediaConfig));
    }

    // Nightlife providers
    // Add Ticketmaster nightlife, Viator nightlife

    // Restaurants providers
    // Add OpenTable

    // Tours providers
    // Add GetYourGuide tours, Travelpayouts tours, Viator tours

    // Vacation Rentals providers
    // Add Booking.com rentals, Expedia rentals, Vrbo, Travelpayouts rentals

    return providers;
  }

  static async updateProviderConfig(
    source: ListingSource,
    updates: Partial<ApiProviderConfig>
  ): Promise<void> {
    // In production, this would update the database or configuration store
    // For now, we'll just log the update
    console.log(`Updating provider config for ${source}:`, updates);
  }
}
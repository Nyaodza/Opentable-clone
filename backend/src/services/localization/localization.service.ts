import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import axios from 'axios';
import * as currency from 'currency.js';

// Localization and Multi-Currency Service
export class LocalizationService extends EventEmitter {
  private redis: Redis;
  private translations: Map<string, Map<string, string>>;
  private currencyRates: Map<string, number>;
  private defaultLocale: string = 'en-US';
  private supportedLocales: string[];
  private supportedCurrencies: string[];

  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });
    this.translations = new Map();
    this.currencyRates = new Map();
    this.supportedLocales = [
      'en-US', 'en-GB', 'es-ES', 'es-MX', 'fr-FR', 'de-DE',
      'it-IT', 'pt-BR', 'ja-JP', 'zh-CN', 'ko-KR', 'ar-AE'
    ];
    this.supportedCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD',
      'MXN', 'BRL', 'INR', 'KRW', 'AED'
    ];
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadTranslations();
    await this.updateCurrencyRates();
    
    // Schedule currency rate updates
    setInterval(() => this.updateCurrencyRates(), 6 * 60 * 60 * 1000); // Every 6 hours
  }

  // Translation Management
  async loadTranslations(): Promise<void> {
    for (const locale of this.supportedLocales) {
      const translations = await this.loadLocaleTranslations(locale);
      this.translations.set(locale, new Map(Object.entries(translations)));
    }
    this.emit('translations:loaded', { locales: this.supportedLocales });
  }

  private async loadLocaleTranslations(locale: string): Promise<Record<string, string>> {
    // Load from database or file system
    const cached = await this.redis.get(`translations:${locale}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Default translations structure
    const translations = await this.getDefaultTranslations(locale);
    await this.redis.set(`translations:${locale}`, JSON.stringify(translations), 'EX', 86400);
    return translations;
  }

  translate(key: string, locale: string = this.defaultLocale, params?: Record<string, any>): string {
    const localeTranslations = this.translations.get(locale) || this.translations.get(this.defaultLocale);
    
    if (!localeTranslations) {
      return key;
    }

    let translation = localeTranslations.get(key) || key;

    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{{${param}}}`, String(value));
      });
    }

    return translation;
  }

  async addTranslation(key: string, translations: Record<string, string>): Promise<void> {
    for (const [locale, translation] of Object.entries(translations)) {
      if (this.translations.has(locale)) {
        this.translations.get(locale)!.set(key, translation);
        await this.saveLocaleTranslations(locale);
      }
    }
    this.emit('translation:added', { key, translations });
  }

  async updateTranslation(key: string, locale: string, translation: string): Promise<void> {
    if (this.translations.has(locale)) {
      this.translations.get(locale)!.set(key, translation);
      await this.saveLocaleTranslations(locale);
      this.emit('translation:updated', { key, locale, translation });
    }
  }

  private async saveLocaleTranslations(locale: string): Promise<void> {
    const translations = Object.fromEntries(this.translations.get(locale)!);
    await this.redis.set(`translations:${locale}`, JSON.stringify(translations), 'EX', 86400);
  }

  // Currency Management
  async updateCurrencyRates(): Promise<void> {
    try {
      const rates = await this.fetchCurrencyRates();
      
      for (const [currency, rate] of Object.entries(rates)) {
        this.currencyRates.set(currency, rate as number);
      }

      await this.redis.set('currency:rates', JSON.stringify(rates), 'EX', 21600); // 6 hours
      this.emit('currency:updated', { rates });
    } catch (error) {
      console.error('Failed to update currency rates:', error);
      await this.loadCachedRates();
    }
  }

  private async fetchCurrencyRates(): Promise<Record<string, number>> {
    // In production, use a real API like exchangerate-api.com or fixer.io
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/USD`, {
      headers: { 'API-Key': process.env.EXCHANGE_RATE_API_KEY }
    });
    
    return response.data.rates;
  }

  private async loadCachedRates(): Promise<void> {
    const cached = await this.redis.get('currency:rates');
    if (cached) {
      const rates = JSON.parse(cached);
      for (const [currency, rate] of Object.entries(rates)) {
        this.currencyRates.set(currency, rate as number);
      }
    } else {
      // Fallback rates
      this.currencyRates.set('USD', 1);
      this.currencyRates.set('EUR', 0.85);
      this.currencyRates.set('GBP', 0.73);
      this.currencyRates.set('JPY', 110.0);
      this.currencyRates.set('CNY', 6.45);
    }
  }

  convertCurrency(amount: number, from: string, to: string): number {
    if (from === to) return amount;

    const fromRate = this.currencyRates.get(from) || 1;
    const toRate = this.currencyRates.get(to) || 1;

    // Convert to USD first, then to target currency
    const usdAmount = from === 'USD' ? amount : amount / fromRate;
    const convertedAmount = to === 'USD' ? usdAmount : usdAmount * toRate;

    return currency(convertedAmount).value;
  }

  formatCurrency(amount: number, currencyCode: string, locale?: string): string {
    const formatter = new Intl.NumberFormat(locale || this.getLocaleForCurrency(currencyCode), {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return formatter.format(amount);
  }

  private getLocaleForCurrency(currencyCode: string): string {
    const currencyLocaleMap: Record<string, string> = {
      'USD': 'en-US',
      'EUR': 'de-DE',
      'GBP': 'en-GB',
      'JPY': 'ja-JP',
      'CNY': 'zh-CN',
      'CAD': 'en-CA',
      'AUD': 'en-AU',
      'MXN': 'es-MX',
      'BRL': 'pt-BR',
      'INR': 'en-IN',
      'KRW': 'ko-KR',
      'AED': 'ar-AE'
    };

    return currencyLocaleMap[currencyCode] || 'en-US';
  }

  // Locale Detection and Management
  detectLocale(acceptLanguage?: string, geoLocation?: GeoLocation): string {
    // Priority: User preference > Browser language > Geo location > Default
    
    if (acceptLanguage) {
      const preferredLocale = this.parseAcceptLanguage(acceptLanguage);
      if (this.supportedLocales.includes(preferredLocale)) {
        return preferredLocale;
      }
    }

    if (geoLocation) {
      const geoLocale = this.getLocaleFromGeoLocation(geoLocation);
      if (this.supportedLocales.includes(geoLocale)) {
        return geoLocale;
      }
    }

    return this.defaultLocale;
  }

  private parseAcceptLanguage(acceptLanguage: string): string {
    const languages = acceptLanguage.split(',')
      .map(lang => {
        const parts = lang.trim().split(';');
        const locale = parts[0];
        const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
        return { locale, quality };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const lang of languages) {
      const normalizedLocale = this.normalizeLocale(lang.locale);
      if (this.supportedLocales.includes(normalizedLocale)) {
        return normalizedLocale;
      }
    }

    return this.defaultLocale;
  }

  private normalizeLocale(locale: string): string {
    // Convert en_US to en-US format
    locale = locale.replace('_', '-');
    
    // Map common variations
    const localeMap: Record<string, string> = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-BR',
      'ja': 'ja-JP',
      'zh': 'zh-CN',
      'ko': 'ko-KR',
      'ar': 'ar-AE'
    };

    return localeMap[locale.split('-')[0]] || locale;
  }

  private getLocaleFromGeoLocation(geoLocation: GeoLocation): string {
    const countryLocaleMap: Record<string, string> = {
      'US': 'en-US',
      'GB': 'en-GB',
      'ES': 'es-ES',
      'MX': 'es-MX',
      'FR': 'fr-FR',
      'DE': 'de-DE',
      'IT': 'it-IT',
      'BR': 'pt-BR',
      'JP': 'ja-JP',
      'CN': 'zh-CN',
      'KR': 'ko-KR',
      'AE': 'ar-AE'
    };

    return countryLocaleMap[geoLocation.countryCode] || this.defaultLocale;
  }

  // Content Localization
  async localizeContent(content: LocalizableContent, locale: string): Promise<LocalizedContent> {
    const localized: LocalizedContent = {
      locale,
      title: content.title[locale] || content.title[this.defaultLocale] || '',
      description: content.description[locale] || content.description[this.defaultLocale] || '',
      content: content.content[locale] || content.content[this.defaultLocale] || '',
      metadata: {}
    };

    // Localize metadata fields
    if (content.metadata) {
      for (const [key, value] of Object.entries(content.metadata)) {
        if (typeof value === 'object' && value !== null && locale in value) {
          localized.metadata[key] = value[locale];
        } else {
          localized.metadata[key] = value;
        }
      }
    }

    return localized;
  }

  // Date and Time Formatting
  formatDate(date: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
  }

  formatTime(date: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: this.uses12HourClock(locale),
      ...options
    };

    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
  }

  private uses12HourClock(locale: string): boolean {
    const twelveHourLocales = ['en-US', 'en-CA', 'en-AU', 'en-IN'];
    return twelveHourLocales.includes(locale);
  }

  // Number Formatting
  formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(locale, options).format(value);
  }

  formatPercentage(value: number, locale: string): string {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  // Phone Number Formatting
  formatPhoneNumber(phoneNumber: string, locale: string): string {
    // Simplified phone formatting based on locale
    const countryFormats: Record<string, (phone: string) => string> = {
      'en-US': (phone) => {
        const cleaned = phone.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
          return `(${match[1]}) ${match[2]}-${match[3]}`;
        }
        return phone;
      },
      'en-GB': (phone) => {
        const cleaned = phone.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{4})(\d{3})(\d{4})$/);
        if (match) {
          return `${match[1]} ${match[2]} ${match[3]}`;
        }
        return phone;
      },
      'fr-FR': (phone) => {
        const cleaned = phone.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
        if (match) {
          return `${match[1]} ${match[2]} ${match[3]} ${match[4]} ${match[5]}`;
        }
        return phone;
      }
    };

    const formatter = countryFormats[locale] || ((phone) => phone);
    return formatter(phoneNumber);
  }

  // Address Formatting
  formatAddress(address: Address, locale: string): string {
    const formatters: Record<string, (addr: Address) => string> = {
      'en-US': (addr) => `${addr.street}\n${addr.city}, ${addr.state} ${addr.postalCode}\n${addr.country}`,
      'en-GB': (addr) => `${addr.street}\n${addr.city}\n${addr.postalCode}\n${addr.country}`,
      'de-DE': (addr) => `${addr.street}\n${addr.postalCode} ${addr.city}\n${addr.country}`,
      'ja-JP': (addr) => `〒${addr.postalCode}\n${addr.state}${addr.city}\n${addr.street}`
    };

    const formatter = formatters[locale] || formatters['en-US'];
    return formatter(address);
  }

  // Default translations helper
  private async getDefaultTranslations(locale: string): Promise<Record<string, string>> {
    // Base translations that would be loaded from files or database
    const translations: Record<string, Record<string, string>> = {
      'en-US': {
        'common.welcome': 'Welcome',
        'common.search': 'Search',
        'common.book_now': 'Book Now',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
        'booking.select_date': 'Select Date',
        'booking.select_time': 'Select Time',
        'booking.party_size': 'Party Size',
        'booking.special_requests': 'Special Requests',
        'restaurant.available': 'Available',
        'restaurant.fully_booked': 'Fully Booked',
        'restaurant.closed': 'Closed',
        'payment.total': 'Total',
        'payment.deposit': 'Deposit',
        'payment.pay_now': 'Pay Now'
      },
      'es-ES': {
        'common.welcome': 'Bienvenido',
        'common.search': 'Buscar',
        'common.book_now': 'Reservar Ahora',
        'common.cancel': 'Cancelar',
        'common.confirm': 'Confirmar',
        'booking.select_date': 'Seleccionar Fecha',
        'booking.select_time': 'Seleccionar Hora',
        'booking.party_size': 'Número de Personas',
        'booking.special_requests': 'Peticiones Especiales',
        'restaurant.available': 'Disponible',
        'restaurant.fully_booked': 'Completo',
        'restaurant.closed': 'Cerrado',
        'payment.total': 'Total',
        'payment.deposit': 'Depósito',
        'payment.pay_now': 'Pagar Ahora'
      },
      'fr-FR': {
        'common.welcome': 'Bienvenue',
        'common.search': 'Rechercher',
        'common.book_now': 'Réserver Maintenant',
        'common.cancel': 'Annuler',
        'common.confirm': 'Confirmer',
        'booking.select_date': 'Sélectionner la Date',
        'booking.select_time': "Sélectionner l'Heure",
        'booking.party_size': 'Nombre de Personnes',
        'booking.special_requests': 'Demandes Spéciales',
        'restaurant.available': 'Disponible',
        'restaurant.fully_booked': 'Complet',
        'restaurant.closed': 'Fermé',
        'payment.total': 'Total',
        'payment.deposit': 'Acompte',
        'payment.pay_now': 'Payer Maintenant'
      }
    };

    return translations[locale] || translations['en-US'];
  }
}

// Type definitions
interface GeoLocation {
  countryCode: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

interface LocalizableContent {
  title: Record<string, string>;
  description: Record<string, string>;
  content: Record<string, string>;
  metadata?: Record<string, any>;
}

interface LocalizedContent {
  locale: string;
  title: string;
  description: string;
  content: string;
  metadata: Record<string, any>;
}

interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export default LocalizationService;
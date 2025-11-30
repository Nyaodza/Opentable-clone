import { AppError } from '../utils/errors';
import axios from 'axios';

export interface Country {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  locale: string;
  phonePrefix: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 0 | 1; // 0 = Sunday, 1 = Monday
  taxRate: number;
  serviceFeeRate: number;
}

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimalDigits: number;
  rate: number; // Exchange rate to USD
}

export interface Translation {
  key: string;
  locale: string;
  value: string;
}

export class LocalizationService {
  private static countries: Map<string, Country> = new Map([
    ['US', {
      code: 'US',
      name: 'United States',
      currency: 'USD',
      currencySymbol: '$',
      timezone: 'America/New_York',
      locale: 'en-US',
      phonePrefix: '+1',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      firstDayOfWeek: 0,
      taxRate: 0.08,
      serviceFeeRate: 0.18,
    }],
    ['GB', {
      code: 'GB',
      name: 'United Kingdom',
      currency: 'GBP',
      currencySymbol: '£',
      timezone: 'Europe/London',
      locale: 'en-GB',
      phonePrefix: '+44',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      taxRate: 0.20,
      serviceFeeRate: 0.125,
    }],
    ['CA', {
      code: 'CA',
      name: 'Canada',
      currency: 'CAD',
      currencySymbol: 'C$',
      timezone: 'America/Toronto',
      locale: 'en-CA',
      phonePrefix: '+1',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '12h',
      firstDayOfWeek: 0,
      taxRate: 0.13,
      serviceFeeRate: 0.15,
    }],
    ['AU', {
      code: 'AU',
      name: 'Australia',
      currency: 'AUD',
      currencySymbol: 'A$',
      timezone: 'Australia/Sydney',
      locale: 'en-AU',
      phonePrefix: '+61',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      firstDayOfWeek: 1,
      taxRate: 0.10,
      serviceFeeRate: 0.10,
    }],
    ['FR', {
      code: 'FR',
      name: 'France',
      currency: 'EUR',
      currencySymbol: '€',
      timezone: 'Europe/Paris',
      locale: 'fr-FR',
      phonePrefix: '+33',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      taxRate: 0.20,
      serviceFeeRate: 0.15,
    }],
    ['DE', {
      code: 'DE',
      name: 'Germany',
      currency: 'EUR',
      currencySymbol: '€',
      timezone: 'Europe/Berlin',
      locale: 'de-DE',
      phonePrefix: '+49',
      dateFormat: 'DD.MM.YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      taxRate: 0.19,
      serviceFeeRate: 0.10,
    }],
    ['ES', {
      code: 'ES',
      name: 'Spain',
      currency: 'EUR',
      currencySymbol: '€',
      timezone: 'Europe/Madrid',
      locale: 'es-ES',
      phonePrefix: '+34',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      taxRate: 0.21,
      serviceFeeRate: 0.10,
    }],
    ['IT', {
      code: 'IT',
      name: 'Italy',
      currency: 'EUR',
      currencySymbol: '€',
      timezone: 'Europe/Rome',
      locale: 'it-IT',
      phonePrefix: '+39',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      taxRate: 0.22,
      serviceFeeRate: 0.10,
    }],
    ['JP', {
      code: 'JP',
      name: 'Japan',
      currency: 'JPY',
      currencySymbol: '¥',
      timezone: 'Asia/Tokyo',
      locale: 'ja-JP',
      phonePrefix: '+81',
      dateFormat: 'YYYY/MM/DD',
      timeFormat: '24h',
      firstDayOfWeek: 0,
      taxRate: 0.10,
      serviceFeeRate: 0.10,
    }],
    ['CN', {
      code: 'CN',
      name: 'China',
      currency: 'CNY',
      currencySymbol: '¥',
      timezone: 'Asia/Shanghai',
      locale: 'zh-CN',
      phonePrefix: '+86',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      taxRate: 0.06,
      serviceFeeRate: 0.10,
    }],
    ['IN', {
      code: 'IN',
      name: 'India',
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      phonePrefix: '+91',
      dateFormat: 'DD-MM-YYYY',
      timeFormat: '12h',
      firstDayOfWeek: 0,
      taxRate: 0.18,
      serviceFeeRate: 0.10,
    }],
    ['BR', {
      code: 'BR',
      name: 'Brazil',
      currency: 'BRL',
      currencySymbol: 'R$',
      timezone: 'America/Sao_Paulo',
      locale: 'pt-BR',
      phonePrefix: '+55',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 0,
      taxRate: 0.17,
      serviceFeeRate: 0.10,
    }],
    ['MX', {
      code: 'MX',
      name: 'Mexico',
      currency: 'MXN',
      currencySymbol: '$',
      timezone: 'America/Mexico_City',
      locale: 'es-MX',
      phonePrefix: '+52',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      firstDayOfWeek: 0,
      taxRate: 0.16,
      serviceFeeRate: 0.10,
    }],
  ]);

  private static currencies: Map<string, Currency> = new Map([
    ['USD', { code: 'USD', symbol: '$', name: 'US Dollar', decimalDigits: 2, rate: 1 }],
    ['EUR', { code: 'EUR', symbol: '€', name: 'Euro', decimalDigits: 2, rate: 0.85 }],
    ['GBP', { code: 'GBP', symbol: '£', name: 'British Pound', decimalDigits: 2, rate: 0.73 }],
    ['CAD', { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimalDigits: 2, rate: 1.25 }],
    ['AUD', { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimalDigits: 2, rate: 1.35 }],
    ['JPY', { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimalDigits: 0, rate: 110 }],
    ['CNY', { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimalDigits: 2, rate: 6.5 }],
    ['INR', { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimalDigits: 2, rate: 75 }],
    ['BRL', { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimalDigits: 2, rate: 5.2 }],
    ['MXN', { code: 'MXN', symbol: '$', name: 'Mexican Peso', decimalDigits: 2, rate: 20 }],
  ]);

  private static exchangeRateCache: Map<string, { rate: number; timestamp: number }> = new Map();
  private static readonly CACHE_TTL = 3600000; // 1 hour

  static getCountry(countryCode: string): Country | undefined {
    return this.countries.get(countryCode);
  }

  static getCurrency(currencyCode: string): Currency | undefined {
    return this.currencies.get(currencyCode);
  }

  static getAllCountries(): Country[] {
    return Array.from(this.countries.values());
  }

  static getAllCurrencies(): Currency[] {
    return Array.from(this.currencies.values());
  }

  static async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) return amount;

    const fromRate = await this.getExchangeRate(fromCurrency);
    const toRate = await this.getExchangeRate(toCurrency);

    // Convert to USD first, then to target currency
    const usdAmount = amount / fromRate;
    const convertedAmount = usdAmount * toRate;

    const toCurrencyInfo = this.getCurrency(toCurrency);
    const decimalDigits = toCurrencyInfo?.decimalDigits || 2;

    return Number(convertedAmount.toFixed(decimalDigits));
  }

  static async getExchangeRate(currencyCode: string): Promise<number> {
    if (currencyCode === 'USD') return 1;

    // Check cache
    const cached = this.exchangeRateCache.get(currencyCode);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.rate;
    }

    try {
      // Fetch latest exchange rates
      const response = await axios.get(
        `https://api.exchangerate-api.com/v4/latest/USD`
      );
      
      const rate = response.data.rates[currencyCode];
      if (!rate) {
        throw new AppError(`Exchange rate not found for ${currencyCode}`, 404);
      }

      // Update cache
      this.exchangeRateCache.set(currencyCode, {
        rate,
        timestamp: Date.now(),
      });

      return rate;
    } catch (error) {
      // Fallback to static rates
      const currency = this.getCurrency(currencyCode);
      return currency?.rate || 1;
    }
  }

  static formatCurrency(
    amount: number,
    currencyCode: string,
    locale?: string
  ): string {
    const currency = this.getCurrency(currencyCode);
    if (!currency) {
      throw new AppError(`Unknown currency: ${currencyCode}`, 400);
    }

    // Use Intl.NumberFormat for proper formatting
    return new Intl.NumberFormat(locale || 'en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currency.decimalDigits,
      maximumFractionDigits: currency.decimalDigits,
    }).format(amount);
  }

  static formatDate(date: Date, countryCode: string): string {
    const country = this.getCountry(countryCode);
    if (!country) {
      throw new AppError(`Unknown country: ${countryCode}`, 400);
    }

    return new Intl.DateTimeFormat(country.locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  static formatTime(date: Date, countryCode: string): string {
    const country = this.getCountry(countryCode);
    if (!country) {
      throw new AppError(`Unknown country: ${countryCode}`, 400);
    }

    return new Intl.DateTimeFormat(country.locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: country.timeFormat === '12h',
    }).format(date);
  }

  static validatePhoneNumber(phoneNumber: string, countryCode: string): boolean {
    const country = this.getCountry(countryCode);
    if (!country) return false;

    // Basic validation - check if starts with country prefix
    const normalizedPhone = phoneNumber.replace(/\s+/g, '');
    return normalizedPhone.startsWith(country.phonePrefix);
  }

  static formatPhoneNumber(phoneNumber: string, countryCode: string): string {
    const country = this.getCountry(countryCode);
    if (!country) return phoneNumber;

    // Basic formatting - add country prefix if not present
    const normalizedPhone = phoneNumber.replace(/\s+/g, '');
    if (!normalizedPhone.startsWith(country.phonePrefix)) {
      return `${country.phonePrefix}${normalizedPhone}`;
    }

    return phoneNumber;
  }

  static calculateTax(amount: number, countryCode: string): number {
    const country = this.getCountry(countryCode);
    if (!country) return 0;

    return Number((amount * country.taxRate).toFixed(2));
  }

  static calculateServiceFee(amount: number, countryCode: string): number {
    const country = this.getCountry(countryCode);
    if (!country) return 0;

    return Number((amount * country.serviceFeeRate).toFixed(2));
  }

  static getTimeZones(): string[] {
    return Array.from(new Set(
      Array.from(this.countries.values()).map(c => c.timezone)
    ));
  }

  static convertTimeZone(date: Date, fromTz: string, toTz: string): Date {
    // Using Intl.DateTimeFormat for timezone conversion
    const fromDate = new Date(
      date.toLocaleString('en-US', { timeZone: fromTz })
    );
    const toDate = new Date(
      date.toLocaleString('en-US', { timeZone: toTz })
    );
    
    const offset = toDate.getTime() - fromDate.getTime();
    return new Date(date.getTime() + offset);
  }

  static getTranslation(key: string, locale: string): string {
    // This would typically fetch from a translation service or database
    const translations: Record<string, Record<string, string>> = {
      'en-US': {
        'welcome': 'Welcome',
        'book_table': 'Book a Table',
        'search_restaurants': 'Search Restaurants',
        'my_reservations': 'My Reservations',
      },
      'es-ES': {
        'welcome': 'Bienvenido',
        'book_table': 'Reservar Mesa',
        'search_restaurants': 'Buscar Restaurantes',
        'my_reservations': 'Mis Reservas',
      },
      'fr-FR': {
        'welcome': 'Bienvenue',
        'book_table': 'Réserver une Table',
        'search_restaurants': 'Rechercher des Restaurants',
        'my_reservations': 'Mes Réservations',
      },
      'de-DE': {
        'welcome': 'Willkommen',
        'book_table': 'Tisch Reservieren',
        'search_restaurants': 'Restaurants Suchen',
        'my_reservations': 'Meine Reservierungen',
      },
      'it-IT': {
        'welcome': 'Benvenuto',
        'book_table': 'Prenota un Tavolo',
        'search_restaurants': 'Cerca Ristoranti',
        'my_reservations': 'Le Mie Prenotazioni',
      },
      'ja-JP': {
        'welcome': 'ようこそ',
        'book_table': 'テーブルを予約',
        'search_restaurants': 'レストランを検索',
        'my_reservations': '私の予約',
      },
      'zh-CN': {
        'welcome': '欢迎',
        'book_table': '预订餐桌',
        'search_restaurants': '搜索餐厅',
        'my_reservations': '我的预订',
      },
    };

    return translations[locale]?.[key] || translations['en-US'][key] || key;
  }

  static detectCountryFromIP(ip: string): Promise<string> {
    // This would typically use a GeoIP service
    // For now, return default
    return Promise.resolve('US');
  }

  static getDistanceUnit(countryCode: string): 'miles' | 'kilometers' {
    // US, UK, and Myanmar use miles
    return ['US', 'GB', 'MM'].includes(countryCode) ? 'miles' : 'kilometers';
  }

  static convertDistance(
    distance: number,
    from: 'miles' | 'kilometers',
    to: 'miles' | 'kilometers'
  ): number {
    if (from === to) return distance;
    
    if (from === 'miles' && to === 'kilometers') {
      return distance * 1.60934;
    } else {
      return distance / 1.60934;
    }
  }
}
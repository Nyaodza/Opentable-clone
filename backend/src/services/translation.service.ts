import { redisClient } from '../config/redis';
import { AppError } from '../utils/errors';
import axios from 'axios';

export interface TranslationKey {
  key: string;
  namespace: string;
  translations: {
    [locale: string]: string;
  };
}

export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  enabled: boolean;
  fallback?: string;
}

export class TranslationService {
  private static locales: Map<string, LocaleConfig> = new Map([
    ['en', {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
      enabled: true,
    }],
    ['es', {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      direction: 'ltr',
      enabled: true,
      fallback: 'en',
    }],
    ['fr', {
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      direction: 'ltr',
      enabled: true,
      fallback: 'en',
    }],
    ['de', {
      code: 'de',
      name: 'German',
      nativeName: 'Deutsch',
      direction: 'ltr',
      enabled: true,
      fallback: 'en',
    }],
    ['it', {
      code: 'it',
      name: 'Italian',
      nativeName: 'Italiano',
      direction: 'ltr',
      enabled: true,
      fallback: 'en',
    }],
    ['pt', {
      code: 'pt',
      name: 'Portuguese',
      nativeName: 'Português',
      direction: 'ltr',
      enabled: true,
      fallback: 'en',
    }],
    ['ja', {
      code: 'ja',
      name: 'Japanese',
      nativeName: '日本語',
      direction: 'ltr',
      enabled: true,
      fallback: 'en',
    }],
    ['ko', {
      code: 'ko',
      name: 'Korean',
      nativeName: '한국어',
      direction: 'ltr',
      enabled: true,
      fallback: 'en',
    }],
    ['zh', {
      code: 'zh',
      name: 'Chinese',
      nativeName: '中文',
      direction: 'ltr',
      enabled: true,
      fallback: 'en',
    }],
    ['ar', {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      direction: 'rtl',
      enabled: true,
      fallback: 'en',
    }],
    ['he', {
      code: 'he',
      name: 'Hebrew',
      nativeName: 'עברית',
      direction: 'rtl',
      enabled: true,
      fallback: 'en',
    }],
    ['hi', {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिन्दी',
      direction: 'ltr',
      enabled: true,
      fallback: 'en',
    }],
    ['ru', {
      code: 'ru',
      name: 'Russian',
      nativeName: 'Русский',
      direction: 'ltr',
      enabled: true,
      fallback: 'en',
    }],
  ]);

  private static translations: Map<string, TranslationKey> = new Map();
  private static readonly CACHE_TTL = 86400; // 24 hours

  static async loadTranslations(namespace: string = 'common'): Promise<void> {
    // Load translations from database or file system
    // This is a simplified version - in production, this would load from a database
    const commonTranslations: TranslationKey[] = [
      {
        key: 'app.name',
        namespace: 'common',
        translations: {
          en: 'OpenTable Clone',
          es: 'Clon de OpenTable',
          fr: 'Clone OpenTable',
          de: 'OpenTable Klon',
          it: 'Clone OpenTable',
          ja: 'OpenTableクローン',
          zh: 'OpenTable克隆',
          ar: 'نسخة OpenTable',
          he: 'שיבוט OpenTable',
          hi: 'OpenTable क्लोन',
          ru: 'Клон OpenTable',
        },
      },
      {
        key: 'nav.home',
        namespace: 'common',
        translations: {
          en: 'Home',
          es: 'Inicio',
          fr: 'Accueil',
          de: 'Startseite',
          it: 'Home',
          ja: 'ホーム',
          zh: '首页',
          ar: 'الرئيسية',
          he: 'בית',
          hi: 'होम',
          ru: 'Главная',
        },
      },
      {
        key: 'nav.restaurants',
        namespace: 'common',
        translations: {
          en: 'Restaurants',
          es: 'Restaurantes',
          fr: 'Restaurants',
          de: 'Restaurants',
          it: 'Ristoranti',
          ja: 'レストラン',
          zh: '餐厅',
          ar: 'المطاعم',
          he: 'מסעדות',
          hi: 'रेस्तरां',
          ru: 'Рестораны',
        },
      },
      {
        key: 'action.book_now',
        namespace: 'common',
        translations: {
          en: 'Book Now',
          es: 'Reservar Ahora',
          fr: 'Réserver Maintenant',
          de: 'Jetzt Buchen',
          it: 'Prenota Ora',
          ja: '今すぐ予約',
          zh: '立即预订',
          ar: 'احجز الآن',
          he: 'הזמן עכשיו',
          hi: 'अभी बुक करें',
          ru: 'Забронировать',
        },
      },
      {
        key: 'search.placeholder',
        namespace: 'common',
        translations: {
          en: 'Search for restaurants, cuisines, or locations',
          es: 'Buscar restaurantes, cocinas o ubicaciones',
          fr: 'Rechercher des restaurants, cuisines ou lieux',
          de: 'Nach Restaurants, Küchen oder Orten suchen',
          it: 'Cerca ristoranti, cucine o località',
          ja: 'レストラン、料理、場所を検索',
          zh: '搜索餐厅、菜系或位置',
          ar: 'ابحث عن المطاعم أو المأكولات أو المواقع',
          he: 'חפש מסעדות, מטבחים או מיקומים',
          hi: 'रेस्तरां, व्यंजन या स्थान खोजें',
          ru: 'Искать рестораны, кухни или места',
        },
      },
    ];

    // Store in memory
    commonTranslations.forEach(translation => {
      const key = `${translation.namespace}.${translation.key}`;
      this.translations.set(key, translation);
    });
  }

  static async translate(
    key: string,
    locale: string,
    params?: Record<string, any>,
    namespace: string = 'common'
  ): Promise<string> {
    // Check cache first
    const cacheKey = `translation:${namespace}:${key}:${locale}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return this.interpolate(cached, params);
    }

    // Get translation
    const fullKey = `${namespace}.${key}`;
    const translation = this.translations.get(fullKey);
    
    if (!translation) {
      // If translation not found, return key
      console.warn(`Translation not found: ${fullKey}`);
      return key;
    }

    let translatedText = translation.translations[locale];
    
    // Fallback to default locale if not found
    if (!translatedText) {
      const localeConfig = this.locales.get(locale);
      const fallbackLocale = localeConfig?.fallback || 'en';
      translatedText = translation.translations[fallbackLocale] || key;
    }

    // Cache the translation
    await redisClient.setex(cacheKey, this.CACHE_TTL, translatedText);

    return this.interpolate(translatedText, params);
  }

  static async translateBatch(
    keys: string[],
    locale: string,
    namespace: string = 'common'
  ): Promise<Record<string, string>> {
    const translations: Record<string, string> = {};
    
    await Promise.all(
      keys.map(async (key) => {
        translations[key] = await this.translate(key, locale, {}, namespace);
      })
    );

    return translations;
  }

  private static interpolate(
    text: string,
    params?: Record<string, any>
  ): string {
    if (!params) return text;

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  static async autoTranslate(
    text: string,
    fromLocale: string,
    toLocale: string
  ): Promise<string> {
    try {
      // Use Google Translate API or similar service
      // This is a placeholder - implement actual API call
      const response = await axios.post(
        `https://translation.googleapis.com/language/translate/v2`,
        {
          q: text,
          source: fromLocale,
          target: toLocale,
          format: 'text',
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`,
          },
        }
      );

      return response.data.data.translations[0].translatedText;
    } catch (error) {
      console.error('Auto-translation failed:', error);
      return text; // Return original text if translation fails
    }
  }

  static getAvailableLocales(): LocaleConfig[] {
    return Array.from(this.locales.values()).filter(locale => locale.enabled);
  }

  static getLocale(code: string): LocaleConfig | undefined {
    return this.locales.get(code);
  }

  static detectLocale(acceptLanguageHeader?: string): string {
    if (!acceptLanguageHeader) return 'en';

    // Parse Accept-Language header
    const languages = acceptLanguageHeader
      .split(',')
      .map(lang => {
        const parts = lang.trim().split(';');
        const code = parts[0].split('-')[0]; // Get primary language code
        const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1;
        return { code, quality };
      })
      .sort((a, b) => b.quality - a.quality);

    // Find first supported language
    for (const lang of languages) {
      if (this.locales.has(lang.code) && this.locales.get(lang.code)!.enabled) {
        return lang.code;
      }
    }

    return 'en'; // Default fallback
  }

  static formatNumber(
    number: number,
    locale: string,
    options?: Intl.NumberFormatOptions
  ): string {
    return new Intl.NumberFormat(locale, options).format(number);
  }

  static formatDate(
    date: Date,
    locale: string,
    options?: Intl.DateTimeFormatOptions
  ): string {
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  static formatRelativeTime(date: Date, locale: string): string {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const daysDiff = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (Math.abs(daysDiff) < 1) {
      const hoursDiff = Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60));
      if (Math.abs(hoursDiff) < 1) {
        const minutesDiff = Math.round((date.getTime() - Date.now()) / (1000 * 60));
        return rtf.format(minutesDiff, 'minute');
      }
      return rtf.format(hoursDiff, 'hour');
    }
    
    return rtf.format(daysDiff, 'day');
  }

  static pluralize(
    count: number,
    locale: string,
    forms: { one: string; few?: string; many?: string; other: string }
  ): string {
    const pr = new Intl.PluralRules(locale);
    const rule = pr.select(count);
    
    switch (rule) {
      case 'one':
        return forms.one;
      case 'few':
        return forms.few || forms.other;
      case 'many':
        return forms.many || forms.other;
      default:
        return forms.other;
    }
  }

  static async exportTranslations(locale: string): Promise<Record<string, any>> {
    const translations: Record<string, any> = {};
    
    for (const [key, translation] of this.translations) {
      const parts = key.split('.');
      let current = translations;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      current[parts[parts.length - 1]] = translation.translations[locale] || '';
    }
    
    return translations;
  }

  static async importTranslations(
    locale: string,
    translations: Record<string, any>,
    namespace: string = 'common'
  ): Promise<void> {
    const flattenObject = (obj: any, prefix = ''): Record<string, string> => {
      return Object.keys(obj).reduce((acc, k) => {
        const pre = prefix.length ? `${prefix}.` : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
          Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
          acc[pre + k] = obj[k];
        }
        return acc;
      }, {} as Record<string, string>);
    };

    const flattened = flattenObject(translations);
    
    for (const [key, value] of Object.entries(flattened)) {
      const fullKey = `${namespace}.${key}`;
      const existing = this.translations.get(fullKey);
      
      if (existing) {
        existing.translations[locale] = value;
      } else {
        this.translations.set(fullKey, {
          key,
          namespace,
          translations: { [locale]: value },
        });
      }
    }
  }
}
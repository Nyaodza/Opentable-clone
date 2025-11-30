export const i18nConfig = {
  defaultLocale: 'en',
  locales: ['en', 'es', 'fr', 'de', 'it', 'ja', 'zh', 'pt', 'ar', 'hi'],
} as const;

export type Locale = (typeof i18nConfig)['locales'][number];

export const languages: Record<Locale, { name: string; nativeName: string; dir?: 'rtl' | 'ltr' }> = {
  en: { name: 'English', nativeName: 'English' },
  es: { name: 'Spanish', nativeName: 'Español' },
  fr: { name: 'French', nativeName: 'Français' },
  de: { name: 'German', nativeName: 'Deutsch' },
  it: { name: 'Italian', nativeName: 'Italiano' },
  ja: { name: 'Japanese', nativeName: '日本語' },
  zh: { name: 'Chinese', nativeName: '中文' },
  pt: { name: 'Portuguese', nativeName: 'Português' },
  ar: { name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  hi: { name: 'Hindi', nativeName: 'हिन्दी' },
};

export function getDirection(locale: Locale): 'rtl' | 'ltr' {
  return languages[locale]?.dir || 'ltr';
}
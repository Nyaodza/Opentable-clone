'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { i18nConfig, type Locale } from './config';

type Dictionary = Record<string, any>;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
  dictionary: Dictionary;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import('./dictionaries/en.json').then((module) => module.default),
  es: () => import('./dictionaries/es.json').then((module) => module.default),
  fr: () => import('./dictionaries/fr.json').then((module) => module.default),
  de: () => import('./dictionaries/de.json').then((module) => module.default),
  it: () => import('./dictionaries/it.json').then((module) => module.default),
  ja: () => import('./dictionaries/ja.json').then((module) => module.default),
  zh: () => import('./dictionaries/zh.json').then((module) => module.default),
  pt: () => import('./dictionaries/pt.json').then((module) => module.default),
  ar: () => import('./dictionaries/ar.json').then((module) => module.default),
  hi: () => import('./dictionaries/hi.json').then((module) => module.default),
};

async function getDictionary(locale: Locale): Promise<Dictionary> {
  try {
    return await dictionaries[locale]();
  } catch {
    return await dictionaries[i18nConfig.defaultLocale]();
  }
}

export function I18nProvider({ 
  children,
  initialLocale = i18nConfig.defaultLocale 
}: { 
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dictionary, setDictionary] = useState<Dictionary>({});

  useEffect(() => {
    getDictionary(locale).then(setDictionary);
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
  };

  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let value: any = dictionary;
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    if (typeof value === 'string' && params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, param) => params[param] || match);
    }
    
    return value || key;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dictionary }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

// Language switcher component
export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  
  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
    >
      <option value="en">🇬🇧 English</option>
      <option value="es">🇪🇸 Español</option>
      <option value="fr">🇫🇷 Français</option>
      <option value="de">🇩🇪 Deutsch</option>
      <option value="it">🇮🇹 Italiano</option>
      <option value="ja">🇯🇵 日本語</option>
      <option value="zh">🇨🇳 中文</option>
      <option value="pt">🇵🇹 Português</option>
      <option value="ar">🇸🇦 العربية</option>
      <option value="hi">🇮🇳 हिन्दी</option>
    </select>
  );
}
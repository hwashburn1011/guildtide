// ============================================================================
// Epic 29: Localization (T-2001 – T-2040)
// ============================================================================

import enStrings from './en.json';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported locales */
export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'pt-BR';

/** A flat or nested key→string map */
export type TranslationMap = Record<string, string | Record<string, string>>;

/** Text direction */
export type TextDirection = 'ltr' | 'rtl';

/** Pluralization rule: given a count, return the plural category */
type PluralRule = (n: number) => 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

// ---------------------------------------------------------------------------
// T-2016: RTL locales
// ---------------------------------------------------------------------------
const RTL_LOCALES: Set<string> = new Set(['ar', 'he', 'fa', 'ur']);

// ---------------------------------------------------------------------------
// T-2012: Pluralization rules per locale
// ---------------------------------------------------------------------------
const PLURAL_RULES: Record<string, PluralRule> = {
  en: (n) => (n === 1 ? 'one' : 'other'),
  es: (n) => (n === 1 ? 'one' : 'other'),
  fr: (n) => (n <= 1 ? 'one' : 'other'),
  de: (n) => (n === 1 ? 'one' : 'other'),
  ja: () => 'other', // Japanese has no grammatical plural
  'pt-BR': (n) => (n <= 1 ? 'one' : 'other'),
};

// ---------------------------------------------------------------------------
// T-2013/T-2014/T-2015: Locale-specific formatting options
// ---------------------------------------------------------------------------
interface LocaleFormats {
  dateStyle: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY/MM/DD';
  thousandSep: string;
  decimalSep: string;
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
}

const LOCALE_FORMATS: Record<string, LocaleFormats> = {
  en: { dateStyle: 'MM/DD/YYYY', thousandSep: ',', decimalSep: '.', currencySymbol: '$', currencyPosition: 'before' },
  es: { dateStyle: 'DD/MM/YYYY', thousandSep: '.', decimalSep: ',', currencySymbol: '\u20ac', currencyPosition: 'after' },
  fr: { dateStyle: 'DD/MM/YYYY', thousandSep: '\u00a0', decimalSep: ',', currencySymbol: '\u20ac', currencyPosition: 'after' },
  de: { dateStyle: 'DD/MM/YYYY', thousandSep: '.', decimalSep: ',', currencySymbol: '\u20ac', currencyPosition: 'after' },
  ja: { dateStyle: 'YYYY/MM/DD', thousandSep: ',', decimalSep: '.', currencySymbol: '\u00a5', currencyPosition: 'before' },
  'pt-BR': { dateStyle: 'DD/MM/YYYY', thousandSep: '.', decimalSep: ',', currencySymbol: 'R$', currencyPosition: 'before' },
};

// ---------------------------------------------------------------------------
// T-2028: Translation memory — consistent terminology
// ---------------------------------------------------------------------------
interface TranslationMemoryEntry {
  source: string;
  target: string;
  context?: string;
}

const STORAGE_KEY = 'guildtide_locale';
const DEFAULT_LOCALE: Locale = 'en';

/**
 * Centralized i18n manager.
 *
 * Features:
 * - Key-based string lookup with namespace support (T-2001)
 * - Dynamic variable interpolation {{var}} (T-2022)
 * - Pluralization per locale (T-2012)
 * - Date / number / currency formatting (T-2013–T-2015)
 * - RTL layout detection (T-2016–T-2017)
 * - Fallback chain: requested locale -> en -> key name (T-2021)
 * - Dynamic font loading hint for CJK (T-2018)
 * - Translation completion tracking (T-2020)
 * - Locale-aware sorting (T-2024)
 * - Missing key detection (T-2025)
 * - Translation memory for consistent terminology (T-2028)
 * - Text expansion estimation (T-2030)
 *
 * Singleton — obtain via I18nManager.getInstance().
 */
export class I18nManager {
  private static instance: I18nManager | null = null;

  private locale: Locale;
  private translations: Map<Locale, TranslationMap> = new Map();
  private missingKeys: Set<string> = new Set();
  private listeners: Array<(locale: Locale) => void> = [];
  private translationMemory: TranslationMemoryEntry[] = [];

  private constructor() {
    this.locale = this.loadLocale();
    // T-2006: English is always loaded as base
    this.translations.set('en', enStrings as unknown as TranslationMap);
  }

  static getInstance(): I18nManager {
    if (!I18nManager.instance) {
      I18nManager.instance = new I18nManager();
    }
    return I18nManager.instance;
  }

  // -----------------------------------------------------------------------
  // Locale persistence (T-2005)
  // -----------------------------------------------------------------------

  private loadLocale(): Locale {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && this.isSupported(saved)) return saved;
    } catch { /* ignore */ }
    return DEFAULT_LOCALE;
  }

  private saveLocale(): void {
    localStorage.setItem(STORAGE_KEY, this.locale);
  }

  // -----------------------------------------------------------------------
  // Locale management
  // -----------------------------------------------------------------------

  getLocale(): Locale {
    return this.locale;
  }

  /** T-2004/T-2005: Change active locale, persist, and notify listeners. */
  async setLocale(locale: Locale): Promise<void> {
    if (!this.isSupported(locale)) return;
    if (!this.translations.has(locale)) {
      await this.loadTranslationFile(locale);
    }
    this.locale = locale;
    this.saveLocale();
    this.applyDirection();
    this.listeners.forEach((fn) => fn(locale));
  }

  isSupported(locale: string): locale is Locale {
    return ['en', 'es', 'fr', 'de', 'ja', 'pt-BR'].includes(locale);
  }

  getSupportedLocales(): Array<{ code: Locale; name: string }> {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Espa\u00f1ol' },
      { code: 'fr', name: 'Fran\u00e7ais' },
      { code: 'de', name: 'Deutsch' },
      { code: 'ja', name: '\u65e5\u672c\u8a9e' },
      { code: 'pt-BR', name: 'Portugu\u00eas (Brasil)' },
    ];
  }

  onLocaleChange(fn: (locale: Locale) => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
  }

  // -----------------------------------------------------------------------
  // T-2007–T-2011: Lazy-load translation files
  // -----------------------------------------------------------------------

  private async loadTranslationFile(locale: Locale): Promise<void> {
    try {
      let data: TranslationMap;
      switch (locale) {
        case 'es': data = (await import('./es.json')).default as unknown as TranslationMap; break;
        case 'fr': data = (await import('./fr.json')).default as unknown as TranslationMap; break;
        case 'de': data = (await import('./de.json')).default as unknown as TranslationMap; break;
        case 'ja': data = (await import('./ja.json')).default as unknown as TranslationMap; break;
        default: data = {} as TranslationMap;
      }
      this.translations.set(locale, data);
    } catch {
      // Fallback to empty — English will be used via chain
      this.translations.set(locale, {} as TranslationMap);
    }
  }

  /** Register translations at runtime (for community contributions or dynamic content). */
  registerTranslations(locale: Locale, map: TranslationMap): void {
    const existing = this.translations.get(locale) ?? ({} as TranslationMap);
    this.translations.set(locale, { ...existing, ...map });
  }

  // -----------------------------------------------------------------------
  // T-2001/T-2021/T-2022: Core translation lookup
  // -----------------------------------------------------------------------

  /**
   * Translate a dotted key, e.g. "heroes.roster".
   * Supports variable interpolation: t('heroes.levelUp', { name: 'Arin', level: 5 })
   * Fallback chain: current locale -> 'en' -> raw key
   */
  t(key: string, vars?: Record<string, string | number>): string {
    const result = this.resolve(key, this.locale) ?? this.resolve(key, 'en') ?? key;

    if (!this.resolve(key, this.locale) && this.locale !== 'en') {
      this.missingKeys.add(`${this.locale}:${key}`);
    }

    if (vars) {
      return this.interpolate(result, vars);
    }
    return result;
  }

  /**
   * T-2012: Pluralized translation.
   * Looks up key_plural when count != 1, falling back to base key.
   */
  tp(key: string, count: number, vars?: Record<string, string | number>): string {
    const rule = PLURAL_RULES[this.locale] ?? PLURAL_RULES.en;
    const category = rule(count);

    // Try key_plural first, then key
    const pluralKey = category !== 'one' ? `${key}_plural` : key;
    const result = this.resolve(pluralKey, this.locale)
      ?? this.resolve(key, this.locale)
      ?? this.resolve(pluralKey, 'en')
      ?? this.resolve(key, 'en')
      ?? key;

    return this.interpolate(result, { count, ...vars });
  }

  private resolve(key: string, locale: Locale): string | undefined {
    const map = this.translations.get(locale);
    if (!map) return undefined;

    const parts = key.split('.');
    let current: unknown = map;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return typeof current === 'string' ? current : undefined;
  }

  // T-2022: Variable interpolation
  private interpolate(text: string, vars: Record<string, string | number>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      return vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`;
    });
  }

  // -----------------------------------------------------------------------
  // T-2013: Date formatting
  // -----------------------------------------------------------------------

  formatDate(date: Date): string {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString();
    const fmt = LOCALE_FORMATS[this.locale]?.dateStyle ?? 'MM/DD/YYYY';

    switch (fmt) {
      case 'DD/MM/YYYY': return `${d}/${m}/${y}`;
      case 'YYYY/MM/DD': return `${y}/${m}/${d}`;
      default: return `${m}/${d}/${y}`;
    }
  }

  // -----------------------------------------------------------------------
  // T-2014: Number formatting
  // -----------------------------------------------------------------------

  formatNumber(n: number, decimals = 0): string {
    const fmt = LOCALE_FORMATS[this.locale] ?? LOCALE_FORMATS.en;
    const fixed = n.toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');

    const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, fmt.thousandSep);
    return decPart ? `${withSep}${fmt.decimalSep}${decPart}` : withSep;
  }

  // -----------------------------------------------------------------------
  // T-2015: Currency formatting
  // -----------------------------------------------------------------------

  formatCurrency(amount: number, decimals = 2): string {
    const fmt = LOCALE_FORMATS[this.locale] ?? LOCALE_FORMATS.en;
    const formatted = this.formatNumber(amount, decimals);
    return fmt.currencyPosition === 'before'
      ? `${fmt.currencySymbol}${formatted}`
      : `${formatted}${fmt.currencySymbol}`;
  }

  // -----------------------------------------------------------------------
  // T-2016/T-2017: RTL support
  // -----------------------------------------------------------------------

  getDirection(): TextDirection {
    return RTL_LOCALES.has(this.locale) ? 'rtl' : 'ltr';
  }

  isRTL(): boolean {
    return RTL_LOCALES.has(this.locale);
  }

  private applyDirection(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('dir', this.getDirection());
    document.documentElement.setAttribute('lang', this.locale);
  }

  // -----------------------------------------------------------------------
  // T-2018: CJK font loading hint
  // -----------------------------------------------------------------------

  needsCJKFont(): boolean {
    return this.locale === 'ja';
  }

  getCJKFontFamily(): string {
    switch (this.locale) {
      case 'ja': return '"Noto Sans JP", "Hiragino Sans", sans-serif';
      default: return 'Arial, sans-serif';
    }
  }

  // -----------------------------------------------------------------------
  // T-2020: Translation completion percentage
  // -----------------------------------------------------------------------

  getCompletionPercentage(locale: Locale): number {
    const enMap = this.translations.get('en');
    const targetMap = this.translations.get(locale);
    if (!enMap || !targetMap || locale === 'en') return 100;

    const enKeys = this.flattenKeys(enMap);
    const targetKeys = this.flattenKeys(targetMap);
    const total = enKeys.length;
    if (total === 0) return 100;

    const translated = enKeys.filter((k) => targetKeys.includes(k)).length;
    return Math.round((translated / total) * 100);
  }

  private flattenKeys(map: TranslationMap, prefix = ''): string[] {
    const keys: string[] = [];
    for (const [k, v] of Object.entries(map)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') {
        keys.push(fullKey);
      } else if (typeof v === 'object') {
        keys.push(...this.flattenKeys(v as unknown as TranslationMap, fullKey));
      }
    }
    return keys;
  }

  // -----------------------------------------------------------------------
  // T-2024: Locale-aware sorting
  // -----------------------------------------------------------------------

  compare(a: string, b: string): number {
    try {
      return a.localeCompare(b, this.locale);
    } catch {
      return a < b ? -1 : a > b ? 1 : 0;
    }
  }

  sortStrings(arr: string[]): string[] {
    return [...arr].sort((a, b) => this.compare(a, b));
  }

  // -----------------------------------------------------------------------
  // T-2025: Missing key tracking
  // -----------------------------------------------------------------------

  getMissingKeys(): string[] {
    return [...this.missingKeys];
  }

  clearMissingKeys(): void {
    this.missingKeys.clear();
  }

  // -----------------------------------------------------------------------
  // T-2028: Translation memory
  // -----------------------------------------------------------------------

  addToMemory(source: string, target: string, context?: string): void {
    this.translationMemory.push({ source, target, context });
  }

  lookupMemory(source: string): TranslationMemoryEntry | undefined {
    return this.translationMemory.find((e) => e.source === source);
  }

  // -----------------------------------------------------------------------
  // T-2030: Text expansion estimation
  // -----------------------------------------------------------------------

  /** Estimate expanded text length for a given locale. German ~ +30%. */
  estimateExpansion(text: string, targetLocale?: Locale): number {
    const locale = targetLocale ?? this.locale;
    const factors: Record<string, number> = {
      en: 1.0,
      es: 1.2,
      fr: 1.25,
      de: 1.3,
      ja: 0.6,  // CJK tends to be shorter in characters
      'pt-BR': 1.2,
    };
    return Math.ceil(text.length * (factors[locale] ?? 1.0));
  }

  // -----------------------------------------------------------------------
  // T-2033: Locale-aware search
  // -----------------------------------------------------------------------

  /** Case-insensitive, locale-aware search within text. */
  localeSearch(haystack: string, needle: string): boolean {
    try {
      return haystack.toLocaleLowerCase(this.locale).includes(needle.toLocaleLowerCase(this.locale));
    } catch {
      return haystack.toLowerCase().includes(needle.toLowerCase());
    }
  }

  // -----------------------------------------------------------------------
  // T-2035: Translation export/import
  // -----------------------------------------------------------------------

  exportTranslations(locale: Locale): string {
    const map = this.translations.get(locale);
    return JSON.stringify(map ?? {}, null, 2);
  }

  importTranslations(locale: Locale, json: string): boolean {
    try {
      const data = JSON.parse(json) as TranslationMap;
      this.registerTranslations(locale, data);
      return true;
    } catch {
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // T-2036: Locale-specific game content
  // -----------------------------------------------------------------------

  /** Get locale-specific asset path suffix. */
  getLocalizedAssetPath(basePath: string): string {
    if (this.locale === 'en') return basePath;
    const ext = basePath.lastIndexOf('.');
    if (ext < 0) return `${basePath}_${this.locale}`;
    return `${basePath.slice(0, ext)}_${this.locale}${basePath.slice(ext)}`;
  }

  // -----------------------------------------------------------------------
  // T-2039: Keyboard layout detection hint
  // -----------------------------------------------------------------------

  getKeyboardLayout(): string {
    switch (this.locale) {
      case 'fr': return 'AZERTY';
      case 'de': return 'QWERTZ';
      default: return 'QWERTY';
    }
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  destroy(): void {
    this.listeners = [];
    this.translations.clear();
    this.missingKeys.clear();
    this.translationMemory = [];
    I18nManager.instance = null;
  }
}

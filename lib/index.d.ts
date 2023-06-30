// TypeScript Version: 4.7

export interface TranslationResult {
  detectedLanguage: DetectedLanguage
  translations: Translation[]
}

export interface DetectedLanguage {
  language: string
  score: number
}

export interface Translation {
  text: string
  transliteration?: Transliteration
  to: string
  sentLen: SentLen
}

export interface Transliteration {
  text: string
  script: string
}

export interface SentLen {
  srcSentLen: number[]
  transSentLen: number[]
}

export class BingTranslator {
    static createTranslator(fromLang: string, toLang: string): Promise<BingTranslator>;
    static enableLog(): void;
    static disableLog(): void;
    static isLanguageSupported(lang: string): boolean;
    translate(text: string, fromLang: string, toLang: string): Promise<TranslationResult>;
}
'use strict';
// reference: https://stackoverflow.com/questions/64732623/typescript-cannot-find-module-or-its-corresponding-type-declarations
// @ts-ignore  
import axios from 'axios';
import { Cache } from './utils/cache.js';
import { Log } from './utils/log.js';
import { isLanguageSupported } from './lang/lang.js';
import { strict as assert } from 'node:assert';
import { URLSearchParams } from 'node:url';

const TOKEN_URL: string = 'https://www.bing.com/translator';
const TRANSLATE_URL: string = 'https://www.bing.com/ttranslatev3?isVertical=1';
const SPELL_CHECK_URL: string = 'https://www.bing.com/tspellcheckv3?isVertical=1';
const USER_AGENT: string = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36';

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
  private fromLang_: string;
  private toLang_: string;
  private cache_: Cache;
  private log_: debug.Debugger;
  private static factory_: Map<string, BingTranslator> = new Map();

  /**
   * Creates an instance of BingTranslator, not exposed to the public.
   * 
   * @param {string} [fromLang='auto-detect']
   * @param {string} [toLang='zh-Hans']
   * @memberof BingTranslator
   * @private
   */
  private constructor(fromLang: string = 'auto-detect', toLang: string = 'zh-Hans') {
    this.fromLang_ = fromLang;
    this.toLang_ = toLang;
    this.cache_ = new Cache(`${fromLang}-${toLang}`);
    // Disable logging by default.
    this.log_ = Log.createLog(`${fromLang}:${toLang}`);
  }

  /**
   * Initialize the translator instance.
   * 
   * @param {void}
   * @returns {Promise<void>}
   * @memberof BingTranslator
   * @private
   */
  private async init(): Promise<void> {
    await this.cache_.init();
  }

  /**
   * Factory method to create a translator instance.
   * 
   * @param {string} [fromLang='auto-detect']
   * @param {string} [toLang='zh-Hans']
   * @returns {Promise<BingTranslator>}
   * @static
   */
  static async createTranslator(fromLang: string = 'auto-detect', toLang: string = 'zh-Hans'): Promise<BingTranslator> {
    let name = `${fromLang}-${toLang}`;
    if (this.factory_.has(name)) {
      return this.factory_.get(name) as BingTranslator;
    }
    let translator = new BingTranslator(fromLang, toLang);
    try {
      await translator.init();
    } catch (err) {
      throw err;
    }
    this.factory_.set(name, translator);
    return translator;
  }

  /**
   * Enable logging for debug.
   * 
   * @static
   * @memberof BingTranslator
   * @example
   * BingTranslator.enableLog();
   */
  static enableLog(): void {
    Log.enable();
  }

  /**
   * Disable logging for debug.
   * 
   * @static
   * @memberof BingTranslator
   * @example
   * BingTranslator.disableLog();
   */
  static disableLog(): void {
    Log.disable();
  }

  /**
   * Determine whether the given language is supported, delegating to {@link isLanguageSupported}.
   * 
   * @param {string} lang
   * @returns {boolean}
   * @memberof BingTranslator
   * @static
   * @example
   * BingTranslator.isLanguageSupported('en');
   * // true
   * BingTranslator.isLanguageSupported('test');
   * // false
   */
  static isLanguageSupported(lang: string): boolean {
    return isLanguageSupported(lang);
  }

  /**
   * Translate the given text from the given language to the given language.
   * 
   * @param {string} text
   * @param {string} [fromLang]
   * @param {string} [toLang]
   * @returns {Promise<TranslationResult>}
   * @memberof BingTranslator
   * @example
   * let translator = new BingTranslator();
   * translator.translate('hello world', 'en', 'zh-Hans');
   * // 你好，世界
   * translator.translate('hello world', 'en');
   * // 你好，世界
   * translator.translate('hello world');
   * // 你好，世界
   */
  async translate(text: string, fromLang: string = this.fromLang_, toLang: string = this.toLang_): Promise<TranslationResult> {
    if (!isLanguageSupported(fromLang) && fromLang !== 'auto-detect') {
      throw new Error(`Language ${fromLang} is not supported.`);
    }
    if (!isLanguageSupported(toLang)) {
      throw new Error(`Language ${toLang} is not supported.`);
    }
    if (fromLang === toLang) {
      throw new Error(`The source language and the target language cannot be the same.`);
    }
    let cookie = this.cache_.get('COOKIE')?.value;
    // Step 1: fetch the token from the server.
    if (!cookie) {
      await this.fetchToken();
    }
    cookie = this.cache_.get('COOKIE')?.value;
    assert.notDeepEqual(cookie, undefined);

    // Step 2: prepare the request url and body.
    const url = await this.constructUrl();
    const requestBody = this.constructBody(text, fromLang, toLang);
    let headers = {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookie,
      referer: 'https://www.bing.com/translator',
      'user-agent': USER_AGENT,
    }

    // Step 3: send the request and get the response.
    try {
      const res = await axios({
        method: 'post',
        url,
        data: requestBody,
        headers,
        responseType: 'json'
      });

      // Status codes could be see: https://learn.microsoft.com/en-us/azure/cognitive-services/translator/reference/v3-0-translate#response-status-codes.
      if (res.status !== 200) {
        throw new Error(`The response status is ${res.status}, and the statusText is ${res.statusText}.`);
      }

      const data = res.data[0];
      return data as TranslationResult;
    } catch (err) {
      this.log_(err);
      throw err;
    }
  }

  /**
   * Fetch the configuration from the server of bing translator.
   * 
   * @param void
   * @returns {Promise<void | Record<string, string>>}
   * @memberof BingTranslator
   */
  async fetchToken(): Promise<void | Record<string, string>> {
    this.log_('Fetching token...');
    try {
      let res = await axios.get(TOKEN_URL, { withCredentials: true })
      const body = res.data;
      const headers = res.headers;
      const cookie = headers['set-cookie']?.map((c: string) => c.split(';')[0]).join('; ')
      const IG = body.match(/IG:"([^"]+)"/)[1];
      const IID = body.match(/data-iid="([^"]+)"/)[1];
      const [key, token, expireDuration] = JSON.parse(
        body.match(/params_AbusePreventionHelper\s?=\s?([^\]]+\])/)[1]
      );
      this.log_(IG, IID, key, token, expireDuration);
      this.cache_.set('IG', IG, expireDuration);
      this.cache_.set('IID', IID, expireDuration);
      this.cache_.set('KEY', key, expireDuration);
      this.cache_.set('TOKEN', token, expireDuration);
      this.cache_.set('COOKIE', cookie, expireDuration);
      this.cache_.set('COUNT', 1, expireDuration);
      await this.cache_.save();
      return {
        IG,
        IID,
        key, 
        token,
        expireDuration,
      }
    } catch(err) {
      this.log_(err);
      throw err;
    }
  }

  /**
   * Construct the url for translation.
   * 
   * @param {void}
   * @returns {Promise<string>}
   * @memberof BingTranslator
   */
  async constructUrl(): Promise<string> {
    const [ IG, IID] = [ this.cache_.get('IG')?.value, this.cache_.get('IID')?.value ];
    assert.notEqual(IG, undefined);
    assert.notEqual(IID, undefined);
    const COUNT = this.cache_.get('COUNT')?.value || 1

    let baseUrl = TRANSLATE_URL;
    baseUrl += `&IG=${IG}&IID=${IID}.${COUNT}`; 
    this.cache_.set('COUNT', COUNT + 1);
    return baseUrl;
  }

  /**
   * Construct the body for translation.
   * 
   * @param text 
   * @param fromLang 
   * @param toLang 
   * @returns {Record<string, string>}
   * @memberof BingTranslator
   */
  constructBody(text: string, fromLang: string, toLang: string): URLSearchParams {
    const [ key, token ] = [ this.cache_.get('KEY')?.value, this.cache_.get('TOKEN')?.value ];
    assert.notDeepEqual(key, undefined);
    assert.notDeepEqual(token, undefined);
    let params = new URLSearchParams();
    params.append('fromLang', fromLang);
    params.append('text', text);
    params.append('to', toLang);
    params.append('token', token);
    params.append('key', key);
    return params;
  }
}

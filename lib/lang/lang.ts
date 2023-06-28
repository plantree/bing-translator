'use strict';

import LANGS from './lang.json' assert { type: "json" };

/**
 * Determine whether the given language is supported.
 * 
 * @param {string} lang
 * @returns {boolean}
 */
export function isLanguageSupported(lang: string): boolean {
    return LANGS.hasOwnProperty(lang);
}
'use scrict';

import { assert } from 'chai';
import { isLanguageSupported } from '../lib/lang/lang.js';

describe('Lang', () => {
    it("should be able to determine whether the given language is supported", () => {
        assert.isTrue(isLanguageSupported('en'));
        assert.isFalse(isLanguageSupported('test'));
    });
})
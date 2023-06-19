'use strict';

import { assert } from 'chai';
import { Log } from '../lib/utils/log.js';

describe('Log', () => {
    it("should be able to create a log instance", () => {
        assert.isFunction(Log.log);
        assert.isTrue(Log.isEnable());
        Log.log('test');

        console.log(Log.disable());
        assert.isFalse(Log.isEnable());
        Log.log('test');

        Log.enable();
        assert.isTrue(Log.isEnable());
        
        let newLog = Log.createLog('bing-translator:cache');
        newLog('test');
    });
});
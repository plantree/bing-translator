'use strict';

import { assert } from 'chai';
import { Cache, CacheItem } from '../lib/utils/cache.js';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';

describe('Cache', () => {
    afterEach(async () => {
        let cacheFile = path.join(process.cwd(), `.cache`);
        await fsPromises.rm(cacheFile, { recursive: true })
            .catch((err) => {
                throw err;
            });
    });

    it("should be able to create and init a cache instance", async () => {
        const cache = new Cache('test');
        // Must call init() before using cache.
        await cache.init();
        assert.isTrue(cache instanceof Cache);
    });

    it ("should be able to set and get cache", async () => {
        const cache = new Cache('test');
        await cache.init();
        assert.isTrue(cache instanceof Cache);

        cache.set('test', { test: 'test' }, 10000);
        assert.isTrue(cache.has('test'));

        let item = cache.get('test') as CacheItem;
        assert.isTrue(item.value['test'] === 'test');
        assert.isTrue(cache.get('test1') === undefined);
    });

    it ("should be able to delete and clear cache", async () => {
        const cache = new Cache('test');
        await cache.init();
        assert.isTrue(cache instanceof Cache);

        cache.set('test', { test: 'test' }, 10000);
        assert.isTrue(cache.has('test'));
        cache.delete('test');
        assert.isFalse(cache.has('test'));

        cache.set('test', { test: 'test' }, 10000);
        assert.isTrue(cache.has('test'));
        cache.set('test1', { test: 'test' }, 10000);
        assert.isTrue(cache.has('test1'));

        cache.clear();
        assert.isFalse(cache.has('test'));
        assert.isFalse(cache.has('test1'));
    });

    it ("should be able to save and flush cache", async () => {
        const cache = new Cache('test');
        await cache.init();
        assert.isTrue(cache instanceof Cache);
        cache.stopFlush();

        // Set DDL to 1 second.
        cache.set('test', { test: 'test' }, 1000);
        assert.isTrue(cache.has('test'));

        // Test save().
        await cache.save();
        await fsPromises.readFile(cache.cacheFile, 'utf-8')
            .then((data) => {
                let cacheData = JSON.parse(data);
                assert.isTrue(cacheData['test'].value['test'] === 'test');
            });

        // Wait for 1 seconds.
        await new Promise(resolve => setTimeout(resolve, 1000));
        assert.isFalse(cache.has('test'));

        cache.startFlush();
        
        // Set DDL to 10 seconds.
        cache.set('test1', { test: 'test' }, 10000);
        assert.isTrue(cache.has('test1'));
        
        // Wait for 2 seconds.
        await new Promise(resolve => setTimeout(resolve, 2000));
        assert.isTrue(cache.has('test1'));
        // Test flush().
        await fsPromises.readFile(cache.cacheFile, 'utf-8')
            .then((data) => {
                console.log(data);
                let cacheData = JSON.parse(data);
                console.log(cacheData);
                assert.isTrue(cacheData['test'] === undefined);
                assert.isTrue(cacheData['test1'] !== undefined);
                assert.isTrue(cacheData['test1'].value['test'] === 'test');
            });
    });
});
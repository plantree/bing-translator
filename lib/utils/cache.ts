'use strict';

import * as fs from 'node:fs';
import process from 'node:process';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { strict as assert } from 'node:assert';
import { Log } from './log.js';

/**
 * Struct of `CacheItem`.
 * 
 * @interface CacheItem
 * @property {string} key
 * @property {any} value
 * @property {number} expire
 * @export CacheItem
 */
interface CacheItem {
    key: string;
    value: any;
    // Could be `Infinity`, which means no expiration.
    expire: number;
}

/**
 * Persistent cache. You can manipulate cache in memory, and do not need to care about persistence,
 * since it will be flushed to disk automatically.
 * 
 * @class Cache
 * @property {boolean} isDirty
 * @property {number} flushInterval
 * @property {string} name
 * @property {string} cacheFile
 * @property {Map<string, CacheItem>} cache
 * @property {fsPromises.FileHandle | undefined} fd
 * @property {NodeJS.Timeout | undefined} timeoutId
 * @property {debug.Debugger} log
 * @property {boolean} isClosed
 * @property {boolean} isSaving
 * @method init
 * @method set
 * @method get
 * @method has
 * @method delete
 * @method clear
 * @method save
 * @method startFlush
 * @method stopFlush
 * @method close
 * @method private removeExpired
 * @method private flush
 * @export Cache
 */
class Cache {
    // Hint, whether need to flush to disk.
    isDirty: boolean;
    // Flush interval in milliseconds.
    flushInterval: number;
    // Cache name, which is used to distinguish different cache.
    name: string;
    // Corresponding Cache in disk.
    cacheFile: string;
    // The real cache data.
    cache: Map<string, CacheItem>;
    // File handle corresponds to cache file.
    fd: fsPromises.FileHandle | undefined;
    // Id of flush timer, should be unref() to prevent blocking process exit.
    // See: https://nodejs.org/api/timers.html#timers_timeout_unref
    timeoutId: NodeJS.Timeout | undefined;
    log: debug.Debugger;
    isClosed: boolean;
    isSaving: boolean;

    constructor(name: string, flushInterval: number = 1000 /* 1 second */) {
        this.isDirty = false;
        this.flushInterval = flushInterval;
        this.name = name;
        this.cacheFile = path.join(process.cwd(), '.cache', `translator-${name}.json`);
        this.cache = new Map();
        this.log = Log.createLog(`cache:${name}`);
        this.isClosed = false;
        this.isSaving = false;
    }

    // Init cache: create cache file if not exist, otherwise load cache from disk.
    // Should always be called before using cache.
    async init(): Promise<void> {
        let error: Error | null = null;
        await fsPromises.access(this.cacheFile, fs.constants.F_OK)
            .then(async () => {
                await fsPromises.readFile(this.cacheFile, 'utf-8')
                    .then((data) => {
                        this.cache = new Map(Object.entries(JSON.parse(data)));
                        // Maybe expired.
                        this.removeExpired();
                    })
                    .catch(async () => {
                        // Syntax error, maybe.
                        await fsPromises.writeFile(this.cacheFile, '{}')
                            .catch((err) => {
                                error = err;
                            });
                    });
            })
            .catch(async () => {
                // Not exist, create it.
                await fsPromises.mkdir(path.dirname(this.cacheFile), { recursive: true })
                    .then(async () => {
                        await fsPromises.writeFile(this.cacheFile, '{}')
                            .catch((err) => {
                                error = err;
                            });
                    })
                    .catch((err) => {
                        error = err;
                    });
            });
        if (error) {
            this.log(`Failed to init cache: ${error}`);
            throw error;
        }

        this.fd = await fsPromises.open(this.cacheFile, 'r+', fs.constants.O_TRUNC);
        assert.notEqual(this.fd, undefined);

        this.timeoutId = setTimeout(() => this.flush(), this.flushInterval);
        this.timeoutId.unref();
        assert.notEqual(this.timeoutId, undefined);
        
        // Register event handler to close automatically.
        process.on('beforeExit', async () => {
            this.log('beforeExit');
            await this.close();
        });
    }
    startFlush(): void {
        this.timeoutId = setTimeout(() => this.flush(), this.flushInterval);
        this.timeoutId.unref();
        assert.notEqual(this.timeoutId, undefined);
    }
    stopFlush(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = undefined;
        }
    }
    private removeExpired(): void {
        const currentTime = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (value.expire !== null && value.expire < currentTime) {
                this.log(`remove expired item: ${key}`);
                this.cache.delete(key);
                this.isDirty = true;
            }
        }
    }
    // Should only be called internally.
    private async flush(): Promise<void> {
        this.log("flush");
        // Maybe no cache, or maybe GC has cleaned up.
        if (this.isClosed || !this.cache) {
            this.isClosed ?? await this.close();
            return;
        }
        this.removeExpired();

        // Only flush when need.
        if (this.isDirty) {
            await this.save()
                ?.catch((err) => {
                    this.log(err);
                    throw err;
                })
            this.isDirty = false;
        }
        this.timeoutId = setTimeout(() => this.flush(), this.flushInterval);
        this.timeoutId.unref();
    }
    get(key: string): CacheItem | undefined {
        let item = this.cache.get(key) as CacheItem;
        if (item && item.expire && item.expire < Date.now()) {
            this.cache.delete(key);
            this.isDirty = true;
            return undefined;
        } else {
            return item;
        }
    }
    // ttl: millisecond, and may be `Infinity`.
    set(key: string, value: any, ttl: number = 0): void {
        let expire = ttl <= 0 ? Infinity : Date.now() + ttl;
        this.cache.set(key, {
            key: key,
            value: value,
            expire: expire
        });
        this.isDirty = true;
    }
    has(key: string): boolean {
        return this.get(key) !== undefined;
    }
    delete(key: string): boolean {
        this.isDirty = true;
        return this.cache.delete(key);
    }
    clear(): void {
        this.cache.clear();
        this.isDirty = true;
    }
    // Close cache, and flush to disk.
    async close(): Promise<void> {
        if (this.isClosed) {
            return;
        }
        this.stopFlush();
        if (this.isDirty) {
            await this.save();
        }
        this.fd?.close();
        this.isClosed = true;
    }
    async save(): Promise<void> {
        if (this.isSaving) {
            return;
        }
        this.isSaving = true;
        let content = JSON.stringify(Object.fromEntries(this.cache));
        this.log('save() ' + content);
        await this.fd?.truncate(0);
        await this.fd?.write(content, 0);
        await this.fd?.sync();
        this.isSaving = false;
    }
}

export { Cache, CacheItem };
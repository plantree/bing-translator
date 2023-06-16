'use strict';

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { strict as assert } from 'node:assert';
import { Log } from './log.js';

interface CacheItem {
    key: string;
    value: Record<string, any>;
    // `Infinity` means no expire.
    expire: number;
}

class Cache {
    isDirty: boolean;
    flushInterval: number;
    name: string;
    cacheFile: string;
    cache: Map<string, CacheItem>;
    fd: fsPromises.FileHandle | undefined;
    timeoutId: NodeJS.Timeout | undefined;
    log: debug.Debugger;

    constructor(name: string, flushInterval: number = 1000) {
        this.isDirty = false;
        this.flushInterval = flushInterval;
        this.name = name;
        this.cacheFile = path.join(process.cwd(), `.cache/${name}.json`);
        this.cache = new Map();
        this.log = Log.createLog(`bing-translator:cache:${name}`);
    }

    async init(): Promise<void> {
        await fsPromises.access(this.cacheFile, fs.constants.F_OK)
            .then(async () => {
                await fsPromises.readFile(this.cacheFile, 'utf-8')
                    .then((data) => {
                        this.cache = JSON.parse(data);
                    })
                    .catch(async () => {
                        await fsPromises.writeFile(this.cacheFile, '{}')
                            .catch((err) => {
                                throw err;
                            });
                    });
            })
            .catch(async () => {
                await fsPromises.mkdir(this.cacheFile.split('/').slice(0, -1).join('/'), { recursive: true })
                    .then(async () => {
                        await fsPromises.writeFile(this.cacheFile, '{}')
                            .catch((err) => {
                                throw err;
                            });
                    })
                    .catch((err) => {
                        throw err;
                    });
            });

        this.fd = await fsPromises.open(this.cacheFile, 'r+');
        assert.notEqual(this.fd, undefined);

        this.timeoutId = setTimeout(() => this.flush(), this.flushInterval);
        assert.notEqual(this.timeoutId, undefined);
    }
    startFlush(): void {
        this.timeoutId = setTimeout(() => this.flush(), this.flushInterval);
        assert.notEqual(this.timeoutId, undefined);
    }
    stopFlush(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = undefined;
        }
    }
    async flush(): Promise<void> {
        if (!this.cache) {
            return;
        }
        this.log('flush');
        const currentTime = Date.now();
        for (const [key, value] of this.cache) {
            if (value.expire < currentTime) {
                this.cache.delete(key);
                this.isDirty = true;
            }
        }
        if (this.isDirty) {
            await this.save()
                ?.then(() => {
                    this.isDirty = false;
                    this.timeoutId = setTimeout(() => this.flush(), this.flushInterval);
                })
                .catch((err) => {
                    this.log(err);
                    throw err;
                });
            this.isDirty = false;
        }
    }
    get(key: string): CacheItem | undefined {
        let item = this.cache.get(key) as CacheItem;
        if (item && item.expire < Date.now()) {
            this.cache.delete(key);
            this.isDirty = true;
            return undefined;
        } else {
            return item;
        }
    }
    set(key: string, value: Record<string, any>, ttl: number = 0): void {
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
    async save(): Promise<void> {
        this.log('save() ' + JSON.stringify(Object.fromEntries(this.cache)));
        await this.fd?.write(JSON.stringify(Object.fromEntries(this.cache)), 0);
    }
}

export { Cache, CacheItem };
'use strict';

import { assert } from "chai";
import BingTranslator from "../lib/translator.js";
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';

describe('BingTranslator', () => {
    after(async () => {
        let cacheFile = path.join(process.cwd(), `.cache`);
        await fsPromises.rm(cacheFile, { recursive: true })
            .catch((err) => {
                throw err;
            });
    });

    it("should be able to create a translator instance", async () => {
        let bingTranslator = await BingTranslator.createTranslator();
        assert.isTrue(bingTranslator instanceof BingTranslator);
    });

    it("should be able to fetch token", async () => {
        let bingTranslator = await BingTranslator.createTranslator();
        assert.isTrue(bingTranslator instanceof BingTranslator);
        let token = await bingTranslator.fetchToken();
        assert.isTrue(token !== undefined);
        console.log(token);
    });

    it("should be able to construct url", async () => {
        let bingTranslator = await BingTranslator.createTranslator();
        assert.isTrue(bingTranslator instanceof BingTranslator);
        // token has been cached.
        let url = await bingTranslator.constructUrl();
        assert.isTrue(url !== undefined);
        assert.isTrue(url.indexOf("IG") !== -1);
        assert.isTrue(url.indexOf("IID") !== -1);
        console.log(url);
    });

    it("should be able to construct body", async () => {
        let bingTranslator = await BingTranslator.createTranslator();
        assert.isTrue(bingTranslator instanceof BingTranslator);
        let body = await bingTranslator.constructBody('hello world', 'en', 'zh-Hans');
        assert.isTrue(body !== undefined);
        console.log(body);
    });

    it("should be able to translate", async () => {
        let bingTranslator = await BingTranslator.createTranslator();
        assert.isTrue(bingTranslator instanceof BingTranslator);
        let result = await bingTranslator.translate('hello world', 'en', 'zh-Hans');
        assert.isTrue(result !== undefined);
        console.log(JSON.stringify(result, null, 4));
        result = await bingTranslator.translate('hello world', 'en', 'zh-Hans');
        assert.isTrue(result !== undefined);
        console.log(JSON.stringify(result, null, 4));
    });
});
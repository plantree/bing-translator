# bing-translator

<p align="left">
<a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-green.svg"></a>
<a href="https://npmcharts.com/compare/bing-translate-service?minimal=true"><img src="https://img.shields.io/npm/dm/bing-translator-service.svg"></a>
</p>

> WARNING: Should not be used for commercial purposed. If you really want, please use the [Azure Service](https://learn.microsoft.com/en-us/azure/cognitive-services/translator/reference/v3-0-languages). 

An **easy** way to get the translator service from Bing.

## Getting Started

##### Install

```bash
$ npm install bing-translate-service
```

##### Usage

```javascript
// For typescript
import { BingTranslator } from "bing-translator-service";

// create an instance of translator from 'en' to 'zh-Hans'. 
const translator = await BingTranslator.createTranslator("en", "zh-Hans");
translator.translate("Hello world")
    .then(data => {
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => {
      console.log(err);
    });

// For javascript
import BingTranslator from "bing-translator-service";

// create an instance of translator from 'auto-detect' to 'zh-Hans'. 
const translator = await BingTranslator.createTranslator("auto", "zh-Hans");
// don't use the default translation rule and use a given one.
translator.translate("Hello world", "en", "zh-Hans")
    .then(data => {
      console.log(JSON.stringify(data, null, 2));
    })
    .catch(err => {
      console.log(err);
    });
```

##### Result

```json
{
  "detectedLanguage": {
    "language": "en",
    "score": 1
  },
  "translations": [
    {
      "text": "世界您好",
      "transliteration": {
        "text": "shìjiè nínhǎo",
        "script": "Latn"
      },
      "to": "zh-Hans",
      "sentLen": {
        "srcSentLen": [
          11
        ],
        "transSentLen": [
          4
        ]
      }
    }
  ]
}
```

## Why do this

Although [bing-translate-api](https://github.com/plainheart/bing-translate-api/tree/master) has already provided a simple way to help using bing translate service, during using it, I found some more features are needed:

- Hot start, to increase the startup speed.
- More information from response.

So,

- I write a cache to save status, which not only reduces impact on bing service, but also starts service quickly.
- Pass out the complete result of the bing service.

## API

```typescript
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
```

Supported languages could be found here: [lang.json](https://github.com/plantree/bing-translator/blob/main/lib/lang/lang.json).

## License 

[MIT](https://opensource.org/license/mit/)

Copyright (c) 2023-present, Plantree

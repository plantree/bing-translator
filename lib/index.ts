'use strict';
// reference: https://stackoverflow.com/questions/64732623/typescript-cannot-find-module-or-its-corresponding-type-declarations
// @ts-ignore  
import axios from 'axios';

// languages service
// let url = 'https://api.cognitive.microsofttranslator.com/languages?api-version=3.0';

// axios.get(url).then((res: any) => {
//     console.log(res.data);
// }).catch((err: any) => {
//     console.log(err);
// });

// translate service
let url = 'https://bing.com/translate'
axios.get(url).then((res: any) => {
    const body = res.data;
    const IG = body.match(/IG:"([^"]+)"/)[1];
    const IID = body.match(/data-iid="([^"]+)"/)[1];
    const [key, token, expireDuration] = JSON.parse(
      body.match(/params_AbusePreventionHelper\s?=\s?([^\]]+\])/)[1]
    );
    console.log(IG, IID, key, token, expireDuration);
}).catch((err: any) => {
    console.log(err);
});
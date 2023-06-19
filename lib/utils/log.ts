'use strict';

import debug from 'debug';

/**
 * A helper class for logging.
 * 
 * @class Log
 * @property {string} namespace
 * @property {debug.Debugger} log
 * @export Log
 */
export class Log {
    private static namespace: string = 'bing-translator*';

    static log: debug.Debugger = debug('bing-translator');

    static enable: () => void = () => {
        debug.enable(Log.namespace);
    }
    static disable: () => string = () => {
        return debug.disable();
    }
    static isEnable: () => boolean = () => {
        return Log.log.enabled;
    }

    static createLog: (newNamespace: string) => debug.Debugger = (newNamespace: string) => {
        return debug(newNamespace);
    }
}
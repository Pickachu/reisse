'use strict';

const awarable = stampit.init((config) => {
    Object.defineProperty(config.instance, 'getStamp', {
        enumerable: false,
        configurable: true,
        value: () => config.stamp
    });
});

/*
 Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 Code distributed by Google as part of the polymer project is also
 subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

(function(document) {
    'use strict';

    // Grab a reference to our auto-binding template
    // and give it some initial binding values
    // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
    var app = document.querySelector('#app');

    app.displayInstalledToast = function() {
        // Check to make sure caching is actually enabled—it won't be in the dev environment.
        if (!document.querySelector('platinum-sw-cache').disabled) {
            document.querySelector('#caching-complete').show();
        }
    };

    // Listen for template bound event to know when bindings
    // have resolved and content has been stamped to the page
    app.addEventListener('dom-change', function() {
        console.log('Our app is ready to rock!');
    });

    // See https://github.com/Polymer/polymer/issues/1381
    window.addEventListener('WebComponentsReady', function() {
        // imports are loaded and elements have been registered
    });

    // Main area's paper-scroll-header-panel custom condensing transformation of
    // the appName in the middle-container and the bottom title in the bottom-container.
    // The appName is moved to top and shrunk on condensing. The bottom sub title
    // is shrunk to nothing on condensing.
    addEventListener('paper-header-transform', function(e) {
        var appName = document.querySelector('#mainToolbar .app-name');
        var middleContainer = document.querySelector('#mainToolbar .middle-container');
        var bottomContainer = document.querySelector('#mainToolbar .bottom-container');
        var detail = e.detail;
        var heightDiff = detail.height - detail.condensedHeight;
        var yRatio = Math.min(1, detail.y / heightDiff);
        var maxMiddleScale = 0.50;  // appName max size when condensed. The smaller the number the smaller the condensed size.
        var scaleMiddle = Math.max(maxMiddleScale, (heightDiff - detail.y) / (heightDiff / (1-maxMiddleScale))  + maxMiddleScale);
        var scaleBottom = 1 - yRatio;

        // Move/translate middleContainer
        Polymer.Base.transform('translate3d(0,' + yRatio * 100 + '%,0)', middleContainer);

        // Scale bottomContainer and bottom sub title to nothing and back
        Polymer.Base.transform('scale(' + scaleBottom + ') translateZ(0)', bottomContainer);

        // Scale middleContainer appName
        Polymer.Base.transform('scale(' + scaleMiddle + ') translateZ(0)', appName);
    });

    // Close drawer after menu item is selected if drawerPanel is narrow
    app.onDataRouteClick = function() {
        var drawerPanel = document.querySelector('#paperDrawerPanel');
        if (drawerPanel.narrow) {
            drawerPanel.closeDrawer();
        }
    };

    // Scroll page to top and expand header
    app.scrollPageToTop = function() {
        document.getElementById('mainContainer').scrollTop = 0;
    };

    app.google = {
        clientId: "506359137115-om8mpv37hi1ehpbpqsofbnkk3oa2q6e2.apps.googleusercontent.com"
    };

    app.selected = 0;



    // Ensures that a given path is created and bound through polymer
    function ensurePath (object, path) {
        if (object.get(path)) return;

        var index  = -1,
            length = path.length - 1, // Do not iterate on last path item
            nested = object,
            walked = '';

        while (nested != null && ++index < length) {
            var key = path[index];
            walked += key;

            if (isObject(nested)) {
                if (nested[key] == null) {
                    object.set(walked, isIndex(path[index + 1]) ? [] : {});
                }
            }

            if (isIndex(key) && !isIndex(path[index + 1])) {
                if (nested[key] == null) {
                    ensureArrayElement(object, path.slice(0, index - 1), key)
                    object.set(walked, {})
                }
            }

            nested  = nested[key];
            walked += '.'
        }
        return object;
    };

    // Creates any number of elements in a polymer bound array, to allow the use
    // of set method
    function ensureArrayElement (object, path, index) {
        var array = object.get(path), i;
        if (index >= array.length) {
            // Number of missing elements from array
            i = index - array.length
            while (i--) {
                object.push(path, undefined)
            }
        }
    }

    function isIndex(value, length) {
        value = (typeof value == 'number' || /^\d+$/.test(value)) ? +value : -1;
        length = length == null ? Infinity : length;
        return value > -1 && value % 1 == 0 && value < length;
    }

    function isObject(value) {
        // Avoid a V8 JIT bug in Chrome 19-20.
        // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
        var type = typeof value;
        return !!value && (type == 'object' || type == 'function');
    }


    app.update = function (lore) {
        console.log("computing update");
        var changeset  = diff(this.lore, lore),
            applier    = () => {
                var i, changes = 1000, change;
                // Apply only 100 changes at a time
                i = 0;
                change = changeset.shift();
                while (changes-- && change) {
                    change.key.unshift('serializedLore');

                    ensurePath(this, change.key);
                    this.set(change.key, change.value);
                    console.log('update', change.key.slice(1, change.key.length - 1), change.value)
                    change = changeset.shift();
                }

                if (changeset.length) setTimeout(applier, 30 * 1000);
            }

        applier();
    };

    app.integrate = function () {
        var changes = app.lore.integrations(), applier, changer;

        if (!changes.length) console.info("app.integrate: everything is up to date.");

        applier    = (changes, amount) => {
            // Apply only 1000 changes at a time
            var i, change;
            i = 0;
            change = changes.shift();
            while (amount-- && change) {
                changer(change);
                change = changes.shift();
            }

            if (changes.length) setTimeout(() => {applier(changes, amount);}, 45 * 1000);
        }

        changer = (change) => {

            change.key.unshift('lore');

            switch(change.type) {
            case 'put':
                this.set(change.key, change.value);
                break;

            case 'push':
                this.push(change.key, change.value);
                break;

            case 'del':
                if (_.isNaN(+change.key[change.key.length - 1])) {
                    return console.warn("app.integrate: don't know how to erase array items yet");
                }
                change.value = null;
                this.set(change.key, change.value);
                break;

            }

            console.log(change.type, change.key.join('.'), change.value);
        };

        applier(changes, 1000);

    };

    app.initialize = function (data) {
        if (data.integrations) return;
        app.lore = Lore(data);
    };

    // TODO implement toJSON on Lore
    app.learn = function () {
        this.measures = Re.learn(app.lore.areas);
    };

    app.predict = function () {
        this.prediction = { events: Re.lisse(app.lore.areas) };
    };

})(document);

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
        // console.log('Our app is ready to rock!');
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

    app.integrate = function () {
        var changes = app.lore.integrations(), applier, changer, serialize;

        if (!changes.length) console.info("app.integrate: everything is up to date.");

        applier    = (changes, amount) => {
            // Apply only 1000 changes at a time
            var i, change;
            i = 0;
            change = changes.shift();
            while (amount-- && change) {

                // Firebase deletes keys that have null values, but the
                // changeset library detects empty properties and set them to
                // null values
                // if (this.get(change.key) === null && change.type == 'del') {}
                //     amount++
                //     continue;
                // }
                serialize(change);
                changer(change);
                change = changes.shift();
            }

            if (changes.length) setTimeout(() => {applier(changes, 1);}, 10 * 1000);
        }

        changer = (change) => {

            switch(change.type) {
            case 'put':
                this.set(change.key, change.value);
                break;

            case 'push':
                this.push(change.key, change.value);
                break;

            case 'del':
                if (!_.isNaN(+change.key[change.key.length - 1])) {
                    return console.warn("app.integrate: Don't know how to erase array items yet: ", change.key.join('.'));
                }
                change.value = null;
                this.set(change.key, change.value);
                break;

            }

            console.log(change.type, change.key.join('.'), change.value);
        };

        serialize = (change) => {
            if (_.isDate(change.value)) {change.value = change.value.getTime()}
        }

        applier(changes, 1);

    };

    app.initialize = function (data, length) {
        if (app.lore && app.lore.integrations) return;
        this.debounce('initializeData', () => {
            app.lore = Lore({areas: data});
        }, 15000);
    };

    // TODO implement toJSON on Lore
    app.learn = function () {
        this.measures = Re.learn(app.lore.areas);
    };

    app.predict = function () {
        this.prediction = { events: Re.lisse(app.lore.areas) };
    };

})(document);

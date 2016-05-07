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
    app._unclassifiedCrieteria = null;

    // Move to integration-manager
    app.integrate = function () {
      Lore.synchronize();
    };

    // Move to classifier manager
    app.learn = function () {
      this.estimating = true;
      Re.estimate(this.ocurrences, this.areas.concat([]))
        .then((estimated) => {
          this.measures = Re.learn(estimated);
          this.estimating = false;
        });

      // this.linkEvents(app.ocurrences, Re.unclassified, ['unclassified']);
      // this.unclassified = {events: Re.unclassified};
    };

    app.predict = function () {
      Re.lisse(app.ocurrences).then((events) => {
        this.linkEvents(app.ocurrences, events, ['predictions']);
        this.prediction = { events: events };
      });
    };

    app.linkEvents = function (ocurrences, events, prefix) {
        if (!Array.isArray(prefix)) throw new TypeError("app.linkEvents: Prefix must be an array.");

        events.forEach((event) => {
            let ocurrence     = ocurrences.find((other) => other.provider.id == event.provider.id);

            if (!event.provider.id) {
                console.log('app', 'No id found for event: `', event.name, '`. Area info: ', event.area);
                return;
            }

            let ocurrenceKey = Polymer.Collection.get(ocurrences).getKey(ocurrence),
                eventKey     = Polymer.Collection.get(events).getKey(event);

            this.linkPaths(prefix.concat(['events', eventKey]).join('.'), ['ocurrences', ocurrenceKey].join('.'));
        });
    };

    app.performate = function () {
      let learnable = Re.learnableSet( this.ocurrences ), areas = this.areas.concat([{provider: {id: 'undefined'}, name: 'no area'}]);
      // classifier = Classifiers.ResponsibilityArea({areas: this.areas});
      // classifier.learn(learnable);
      //
      // let predictions = classifier.predict(learnable);

      let data = _(learnable)
        // Group behaviors by 1 of the 24 hours of the day
        .groupBy((behavior)      => behavior.completedAt.getHours())
        .mapValues((group) =>
          _(group)
            .values()
            .groupBy('areaId')
            .value())
        .map((grouped, index) => {

          let hour          = +index + 1;
          let amounts       = _.map(grouped, 'length');
          let total         = ss.sum(amounts);

          let hourlines = [];
          _.map(grouped, (behaviors, areaId) => {
            let amount = behaviors.length, area = areas.find((a) => a.provider.id == areaId);
            hourlines.push({key: area.name, x: hour, y: amount / total});
          });

          return hourlines;
        })
        .flatten()
        .groupBy('key')
        .map((hourlines, area) => {
          hourlines.forEach((hourline) => delete hourline.key);

          // Fill empty hours
          let hour = 0;
          while (hour < 24) {
            if (!(hourlines.find((hourline) => hourline.x == (hour + 1)))) {
              hourlines.push({x: hour + 1, y: 0})
            }
            hour++;
          }

          hourlines = _.sortBy(hourlines, 'x');

          return {
            key: area,
            values: hourlines
          };
        }).value();

      // [{
      //   key: nome da area,
      //   values: [{
      //     x: hora do dia
      //     y: % de tarefas da hora
      //   }]
      // }]

      let chart = document.querySelector('#chart');
      chart.data = data;
      chart.generateChart();
      chart._chart.stacked(true);
      chart._chart.update();
      this.perfomance = {
        task_completion_by_daytime: {
          learnable: learnable
        }
      }
    };

    // Manage event features
    FeatureManager(app);
    /// IntegrationManager(app);

    // Allow offline firebase suport
    // Firebase.getDefaultConfig().setPersistenceEnabled(true);

})(document);

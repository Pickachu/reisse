'use strict';

Estimator.add(stampit({
  refs: {
    name: 'time'
  },
  init() {
    this.time = Classifier.get('time');
  },
  methods: {
    estimate (behaviors) {
      return this.when('duration').then((resolve) => {
        // this.inferRelativeTime(behaviors);
        return this.inferActualTime(behaviors, resolve);
      });
    },

    inferActualTime(behaviors, finished) {
      return this.time.learn(behaviors).then(() => {
        this.time.predict(behaviors).then(finished);
      });
    },

    // timeFromTagNames (ocurrence) {
    //   if (Number.isFinite(ocurrence.features.time.actual)) return ocurrence;
    //   if (!ocurrence.tagNames) {
    //     console.warn(`estimators.time: Invalid tag names for ocurrence ${ocurrence.name}, tag names: ${ocurrence.tagNames}. Check for sync problems.`);
    //     return ocurrence;
    //   }
    //
    //   let aggregate = ocurrence.tagNames.reduce((total, name) => {
    //       return total + (this.tagsTime[name] || 0);
    //   }, 0);
    //
    //   if (aggregate) ocurrence.features.time.actual = aggregate;
    //
    //   return ocurrence;
    // },

    // inferRelativeTime(behaviors) {
    //   let finite = Number.isFinite;
    //
    //   behaviors.forEach((ocurrence) => {
    //     let time = ocurrence.features.time,
    //         relative = time.relative,
    //         actual   = time.actual
    //
    //     if (finite(relative) && finite(actual)) {
    //       let relatives = this.durationMap.get(actual) || [];
    //       relatives.push(relative);
    //       this.durationMap.set(actual, relatives);
    //     } else {
    //       let relatives = this.durationMap.get('unknowns');
    //       relatives.push(relative);
    //       this.durationMap.set('unknowns', relatives);
    //     }
    //   });
    //
    //   this.durationMap.set('unknowns', this.durationMap.get('unknowns').sort());
    // },
    // timeFromRelativeTime(ocurrence) {
    //   if (Number.isFinite(ocurrence.features.time.actual)) return ocurrence;
    //   let relativeTime = ocurrence.features.time.relative;
    //
    //   let flag = 0b00,
    //       scale = 0,
    //       bounds = {actuals: {}, relatives: {}},
    //       pair;
    //
    //   // relative known bounds
    //   bounds.relatives = this._relativeTimeKnownBounds(this.durationMap.get('unknowns'), relativeTime);
    //
    //   // actual known bounds
    //   bounds.actual = this._actualTimeKnownBounds(bounds);
    //
    //   // The scale is a factor used to convert relative time into actual
    //   // time The two nearest relative times that have actual values
    //   // stored are harnessed then gets divided by the amount of
    //   // in-between relative times, giving an aproximation of actual
    //   // values for relative times
    //   //
    //   // Example:
    //   //  target relative: 10
    //   //  stored relatives: ... 8 9 10 11 12 13 ...
    //   //  stored actuals  : 9 -> 25000s, 12 -> 28000s
    //   //  scale will be : 28000 - 25000 / 12 - 9 = 1000s
    //
    //   scale = (bounds.actuals.upper - bounds.actuals.lower) / (bounds.relatives.upper - bounds.relatives.lower)
    //
    //   // time
    //   if (relativeTime * scale) ocurrence.features.time.actual = relativeTime * scale;
    //
    //   return ocurrence;
    // },
    // _relativeTimeKnownBounds(unknowns, relativeTime) {
    //   let index = unknowns.indexOf(relativeTime), bounds = {}, i, l, cursor;
    //
    //   // lower
    //   i      = index;
    //   cursor = relativeTime;
    //   while (i--) {
    //     if (cursor - 1 != unknowns[i]) {
    //       bounds.lower = cursor - 1
    //       break
    //     }
    //   }
    //
    //   // upper
    //   i      = index;
    //   l      = unknowns.length
    //   cursor = relativeTime;
    //   while (i++ < l) {
    //     if (cursor + 1 != unknowns[i]) {
    //       bounds.upper = cursor + 1
    //       break
    //     }
    //   }
    //
    //   return bounds;
    // },
    // _actualTimeKnownBounds (bounds) {
    //   let pair = [], flag = 0b00;
    //
    //   for (pair of this.durationMap) {
    //     let actual = pair[0], relatives = pair[1];
    //
    //     if (relatives.indexOf(bounds.relatives.upper) >= 0) {
    //       bounds.actuals.upper = actual
    //       flag = flag | 0b01
    //     }
    //
    //     if (relatives.indexOf(bounds.relatives.lower) >= 0) {
    //       bounds.actuals.lower = actual
    //       flag = flag | 0b10
    //     }
    //
    //     if (flag != 0b11) break;
    //   };
    //
    //   return bounds;
    // }

  }
}));

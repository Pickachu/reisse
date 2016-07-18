'use strict';

estimators.duration = stampit({
  init () {
      this.durationMap.set('unknowns', []);
  },
  methods: {
    estimate (ocurrences) {
      this.estimation = new Promise((resolve) => {
        this.inferRelativeDurations(ocurrences);
        this.inferActualDurations(ocurrences, resolve);
      });
      return this.estimation;
    },

    inferRelativeDurations(ocurrences) {
      let finite = Number.isFinite;

      ocurrences.forEach((ocurrence) => {
        let duration = ocurrence.features.duration,
            relative = duration.relative,
            actual   = duration.actual

        if (finite(relative) && finite(actual)) {
          let relatives = this.durationMap.get(actual) || [];
          relatives.push(relative);
          this.durationMap.set(actual, relatives);
        } else {
          let relatives = this.durationMap.get('unknowns');
          relatives.push(relative);
          this.durationMap.set('unknowns', relatives);
        }
      });

      this.durationMap.set('unknowns', this.durationMap.get('unknowns').sort());
    },

    inferActualDurations(ocurrences, finished) {
      let unprocessed = _.sortBy(ocurrences.concat([]), 'createdAt').reverse();

      let infer = () => {
        let ocurrence = unprocessed.shift();

        // No more ocurrences to process, resolve main promise
        if (!ocurrence) return finished(ocurrences);

        // Actual duration already defined, does not need to infer
        // TODO infer actual duration when sincronized dates are missing
        if (Number.isFinite(ocurrence.features.duration.actual)) return infer();

        Promise.resolve(ocurrence)
          // TODO figure out if this will be needed
          // .then(this.timeFromCalendarEvents.bind(this))
          .then(this.timeFromTagNames.bind(this))
          .then(this.timeFromRelativeDuration.bind(this))
          .then(infer);
      }

      infer();
    },

    timeFromTagNames (ocurrence) {
      if (Number.isFinite(ocurrence.features.duration.actual)) return ocurrence;
      if (!ocurrence.tagNames) {
        console.warn(`estimators.duration: Invalid tag names for ocurrence ${ocurrence.name}, tag names: ${ocurrence.tagNames}. Check for sync problems.`);
        return ocurrence;
      }

      let aggregate = ocurrence.tagNames.reduce((total, name) => {
          return total + (this.tagsDurations[name] || 0);
      }, 0);

      if (aggregate) ocurrence.features.duration.actual = aggregate;

      return ocurrence;
    },
    timeFromRelativeDuration(ocurrence) {
      if (Number.isFinite(ocurrence.features.duration.actual)) return ocurrence;
      let relativeDuration = ocurrence.features.duration.relative;

      let flag = 0b00,
          scale = 0,
          bounds = {actuals: {}, relatives: {}},
          pair;

      // relative known bounds
      bounds.relatives = this._relativeDurationKnownBounds(this.durationMap.get('unknowns'), relativeDuration);

      // actual known bounds
      bounds.actual = this._actualDurationKnownBounds(bounds);

      // The scale is a factor used to convert relative time into actual
      // time The two nearest relative times that have actual values
      // stored are harnessed then gets divided by the amount of
      // in-between relative times, giving an aproximation of actual
      // values for relative times
      //
      // Example:
      //  target relative: 10
      //  stored relatives: ... 8 9 10 11 12 13 ...
      //  stored actuals  : 9 -> 25000s, 12 -> 28000s
      //  scale will be : 28000 - 25000 / 12 - 9 = 1000s

      scale = (bounds.actuals.upper - bounds.actuals.lower) / (bounds.relatives.upper - bounds.relatives.lower)

      // time
      if (relativeDuration * scale) ocurrence.features.duration.actual = relativeDuration * scale;

      return ocurrence;
    },
    _relativeDurationKnownBounds(unknowns, relativeDuration) {
      let index = unknowns.indexOf(relativeDuration), bounds = {}, i, l, cursor;

      // lower
      i      = index;
      cursor = relativeDuration;
      while (i--) {
        if (cursor - 1 != unknowns[i]) {
          bounds.lower = cursor - 1
          break
        }
      }

      // upper
      i      = index;
      l      = unknowns.length
      cursor = relativeDuration;
      while (i++ < l) {
        if (cursor + 1 != unknowns[i]) {
          bounds.upper = cursor + 1
          break
        }
      }

      return bounds;
    },
    _actualDurationKnownBounds (bounds) {
      let pair = [], flag = 0b00;

      for (pair of this.durationMap) {
        let actual = pair[0], relatives = pair[1];

        if (relatives.indexOf(bounds.relatives.upper) >= 0) {
          bounds.actuals.upper = actual
          flag = flag | 0b01
        }

        if (relatives.indexOf(bounds.relatives.lower) >= 0) {
          bounds.actuals.lower = actual
          flag = flag | 0b10
        }

        if (flag != 0b11) break;
      };

      return bounds;
    }

  },
  refs: {
    durationMap: new Map(),
    tagsDurations: {
      "5⃣🕐"       : 5  * 60,
      "🍅"          : 1 * 30 * 60,
      "🍅🍅"        : 2 * 30 * 60,
      "🍅🍅🍅"      : 3 * 30 * 60,
      "🍅🍅🍅🍅"    : 4 * 30 * 60,
      "🍅🍅🍅🍅🍅"  : 5 * 30 * 60
    }
  }
});

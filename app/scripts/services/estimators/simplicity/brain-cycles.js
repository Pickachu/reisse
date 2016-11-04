'use strict';

estimators.brainCycles = stampit({
  init() {
    // TODO set this now to ocurrence hour context
    this.now = Date.now();
  },
  methods: {
      // TODO use task duration to estimate brain cycles
      estimate (ocurrences) {

        // this.inferRelativeBrainCycles(ocurrences);
        ocurrences.forEach(this.inferActualBrainCycles, this);

        // ocurrences.forEach(this.inferActualDuration, this);
      },

      inferActualBrainCycles(ocurrence) {
        let cycles = 0, activityType;

        switch (ocurrence.getStamp()) {
          case Task:
            cycles += this.forTask(ocurrence);
            break;
          case Ocurrence:
            // TODO compute brainCycles for ocurrence
            cycles += 0;
            break;
          case Activity:
            // TODO compute exclusive for activities
            cycles += 0;
            break;
          default:
            console.error('unknowns stamp provided for brain cycle computation');
            break;
        }

        if (ocurrence.activity && (activityType = _.capitalize(ocurrence.type || ocurrence.activity.type))) {
          cycles += this[`for${activityType}`](ocurrence);
        }

        return ocurrence.features.brainCycles.actual = cycles;
      },

      forTask (task) {
        // For compute the brain cycles we use:
        let outdation = ICAL.Duration.fromSeconds(((task.completedAt || this.now) - task.createdAt) / 1000),
        cycles = 0, days;

        // Reading text expends brain cycles but it is easier to understand what
        // you was supposed to do for each additional word
        // - 5 brain cycles for having text, 0.1 less brain cycle for each additional world
        cycles += Math.max(0, 4 - task.name.split(/W/g).length * 0.1);

        // For each day past from this task creation it is a tiny bit harder to remember the task
        // - 0.01 brain cycle for each day past the task creation date
        // TODO create function to better infer brain cycles outdation
        days    = outdation.toSeconds() / (24 * 60 * 60)
        cycles += days * 0.1;

        // You need to interpret each tag name to help understand the task
        // - 0.5 brain cycle for each tag name interpretation
        cycles += task.tagNames.length;

        return cycles;
      },

      forSleep (sleep) {
        return 0;
      },

      forNap (sleep) {
        return 0;
      },

      forMeal (meal) {
        return 0;
      },

      inferRelativeBrainCycles(ocurrences) {

      },

      inferActualDuration(ocurrence) {
          let actual = 0, duration = ocurrence.features.duration;

          // Actual duration already define, does not need to infer
          if (duration.actual) return;

          if (ocurrence.tagNames) {
              actual = ocurrence.tagNames.reduce((total, name) => {
                  return total + (this.tagsDurations[name] || 0)
              }, 0);
          }

          if (!actual) {
              actual = this.timeFromRelativeDuration(duration.relative);
          }

          actual && (duration.actual = actual);
      },
      timeFromRelativeDuration(relativeDuration) {
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
          return relativeDuration * scale;

      }
      // _relativeDurationKnownBounds(unknowns, relativeDuration) {
      //     let index = unknowns.indexOf(relativeDuration), bounds = {}, i, l, cursor;
      //
      //     // lower
      //     i      = index;
      //     cursor = relativeDuration;
      //     while (i--) {
      //         if (cursor - 1 != unknowns[i]) {
      //             bounds.lower = cursor - 1
      //             break
      //         }
      //     }
      //
      //     // upper
      //     i      = index;
      //     l      = unknowns.length
      //     cursor = relativeDuration;
      //     while (i++ < l) {
      //         if (cursor + 1 != unknowns[i]) {
      //             bounds.upper = cursor + 1
      //             break
      //         }
      //     }
      //
      //     return bounds;
      //
      // },
      // _actualDurationKnownBounds (bounds) {
      //     let pair = [], flag = 0b00;
      //
      //     for (pair of this.durationMap) {
      //         let actual = pair[0], relatives = pair[1];
      //
      //         if (relatives.indexOf(bounds.relatives.upper) >= 0) {
      //             bounds.actuals.upper = actual
      //             flag = flag | 0b01
      //         }
      //
      //         if (relatives.indexOf(bounds.relatives.lower) >= 0) {
      //             bounds.actuals.lower = actual
      //             flag = flag | 0b10
      //         }
      //
      //         if (flag != 0b11) break;
      //     };
      //
      //     return bounds;
      // }

  }
});

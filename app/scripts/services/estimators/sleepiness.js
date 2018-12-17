'use strict';

Estimator.add(stampit({
  refs: {
    name: 'sleepiness'
  },
  init () {
    this.sleepiness = Classifier.get('sleepiness');
  },
  methods: {
    estimate(occurrences) {
      let learnable = this.inferrableSet(occurrences);

      // TODO estimate context for past occurrences
      return this.contextualize(learnable)
        .then( () => this.sleepiness.sleep.learn(learnable))
        .then( () => this.sleepiness.learn(learnable))
        .then( () => this.inferActualSleepiness(learnable))
    },

    // TODO estimate context for past occurrences
    contextualize (occurrences) {
      occurrences.forEach((occurrence) => {
        occurrence.context.calendar = {now: occurrence.start};
      });

      return Promise.resolve(occurrences);
    },

    inferActualSleepiness (occurrences) {
      occurrences.forEach((occurrence, index) => {
        if (!occurrence.context.calendar.now) return this.skips.push(occurrence);
        const {context} = occurrence;
        occurrence.features.sleepiness.actual = this.sleepiness.predict([occurrence], {context}) || 0.5;
      });
    }
  }
}));

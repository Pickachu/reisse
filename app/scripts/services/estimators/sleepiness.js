'use strict';

Estimator.add(stampit({
  refs: {
    name: 'sleepiness'
  },
  init () {
    this.sleepiness = Classifier.get('sleepiness');
  },
  methods: {
    estimate(ocurrences) {
      let learnable = this.inferrableSet(ocurrences);

      // TODO estimate context for past ocurrences
      return this.contextualize(learnable)
        .then( () => this.sleepiness.sleep.learn(learnable))
        .then( () => this.sleepiness.learn(learnable))
        .then( () => this.inferActualSleepiness(learnable))
    },

    // TODO estimate context for past ocurrences
    contextualize (ocurrences) {
      ocurrences.forEach((ocurrence) => {
        ocurrence.context.calendar = {now: ocurrence.start};
      });

      return Promise.resolve(ocurrences);
    },

    inferActualSleepiness (ocurrences) {
      ocurrences.forEach((ocurrence, index) => {
        if (!ocurrence.context.calendar.now) return this.skips.push(ocurrence);
        this.sleepiness.context = ocurrence.context;
        ocurrence.features.sleepiness.actual = this.sleepiness.predict([ocurrence]) || 0.5;
      });
    }
  }
}));

'use strict';

estimators.sleepiness = stampit({
  init () {
    this.sleepiness = Classifier.sleepiness;
  },
  methods: {
    estimate(ocurrences) {
      let learnable = Re.learnableSet(ocurrences);

      // TODO estimate context for past ocurrences
      this.contextualize(learnable);
      this.sleepiness.sleep.learn(learnable);
      this.sleepiness.learn(learnable);

      this.inferActualSleepiness(learnable);
      return true;
    },

    // TODO estimate context for past ocurrences
    contextualize (ocurrences) {
      ocurrences.forEach((ocurrence) => {
        ocurrence.context.calendar = {now: ocurrence.start};
      });
    },

    inferActualSleepiness (ocurrences) {
      ocurrences.forEach((ocurrence, index) => {
        this.sleepiness.context = ocurrence.context;
        if (!ocurrence.features.sleepiness) return;
        ocurrence.features.sleepiness.actual = this.sleepiness.predict([ocurrence]) || 0.5;
      });
    }
  }
});

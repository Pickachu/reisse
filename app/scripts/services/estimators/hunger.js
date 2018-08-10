'use strict';

Estimator.add(stampit({
  refs: {
    name: 'hunger'
  },
  init () {
    this.hunger = Classifier.get('hunger');
  },
  methods: {
    estimate(ocurrences) {
      let learnable = this.inferrableSet(ocurrences);

      // TODO estimate context for past ocurrences
      return this.contextualize(learnable)
        .then( () => this.hunger.learn(learnable))
        .then( () => this.inferActualHunger(learnable))
    },

    // TODO estimate context for past ocurrences
    contextualize (ocurrences) {
      ocurrences.forEach((ocurrence) => {
        ocurrence.context.calendar = {now: ocurrence.start};
      });

      return Promise.resolve(ocurrences);
    },

    inferActualHunger (ocurrences) {
      return this.hunger.predict(ocurrences).then((predictions) => {
        ocurrences.forEach((ocurrence, index) => {
          ocurrence.features.hunger.actual = predictions[index] || 0.5;
        });
      });
    }
  }
}));

'use strict';

// Sensation estimator
// • TODO perhaps is a great idea to move BJFogg factors estimation to the domain model?
// • Since there are no specific devices to measure/extract sensation values from humans
// and we are using the BJ Fogg conceptual sensation construct.
// • The actual sensation value is a prediction based on actual measurable
// values (sleepiness and hunger for now) for ocurrences that have happened.
Estimator.add(stampit({
  refs: {
    name: 'sensation'
  },
  init() {
    this.sensation = Classifier.get('sensation');
  },
  methods: {
    estimate (behaviors) {
      return this.when('sleepiness', 'hunger').then(() =>
        this.inferActualSensation(this.inferrableSet(behaviors))
      );
    },

    inferActualSensation(behaviors) {
      return this.sensation.learn(behaviors).then(() =>
        this.sensation.predict(behaviors)
          .then((predictions) =>
            predictions.forEach((prediction, index) =>
              behaviors[index].features.sensation.actual = prediction
            )
          )
      );
    }
  }
}));

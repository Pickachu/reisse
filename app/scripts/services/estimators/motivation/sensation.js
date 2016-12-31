'use strict';

estimators.sensation = estimatorable.compose(stampit({
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

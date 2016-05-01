'use strict'
/*
  Ironically estimators serve to estimate Actual feature values, not Estimated ones.
  Generally it is a set of good rules that try to estimate the conditions with which the ocurrence actually happened.
  Eg: The duration estimator try to guess the best task duration based on it's tags.

TODO perhaps use smarter estimators with neural nets
*/
var estimatorable = stampit({
  init () {
    Object.keys(estimators).forEach((name) => {
      this.estimators.push(estimators[name]({areas: this.areas, name: name}))
    });
  },
  props: {
    areas     : [],
    estimators: []
  },
  methods: {
    estimate () {
      let estimations = Promise.all(this.estimators.map((estimator) => {
          console.log("estimating", estimator.name);
          return estimator.estimate(this.ocurrences, this.areas);
      }));

      return new Promise((resolve) =>
        estimations.then(() => resolve(this.ocurrences))
      );
    }
  }
}),
    estimators = {},
    Estimator  = estimatorable;

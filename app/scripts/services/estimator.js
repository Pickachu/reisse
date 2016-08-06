'use strict'
/*
  Ironically estimators serve to estimate Actual feature values, not Estimated ones.
  Generally it is a set of good rules that try to estimate the conditions with which the ocurrence actually happened.

  Eg: The duration estimator try to guess the best task duration based on it's tags.

  Also estimators estimate the BJFogg actual values entirelly, because they are manly
  virtual values based on value judgments.

  Eg: The brain cycles and time estimators estimates the actual BJFogg's simplicity brain cycles and time factors.

  TODO perhaps is a great idea to move BJFogg factors estimation to the domain model?
  TODO perhaps use smarter estimators with neural nets
*/
var estimatorsable = stampit({
  init () {
    this.boundWhen = this.when.bind(this);

    Object.keys(estimators).forEach((name) => {
      this.estimators.push(estimators[name]({
        areas: this.areas,
        name: name,
        when: this.boundWhen
      }));
    });
  },
  props: {
    areas      : [],
    estimators : [],
    estimations: []
  },
  methods: {
    estimate () {
      this.estimators.forEach((estimator) => {
          console.log("estimating", estimator.name);
          let estimation = estimator.estimate(this.ocurrences, this.areas)
          this.estimations.push(estimation);

          Promise.resolve(estimation).then((estimated) => {
            console.log("estimated", estimator.name);
            return estimated;
          });
          return estimation;
      });

      let estimates = Promise.all(this.estimations);

      estimates.then(() => {console.log('estimation finished')});

      return new Promise((resolve) =>
        estimates.then(() => resolve(this.ocurrences))
      );
    },
    when (name) {
      let estimator = this.estimators.findIndex((estimator) => estimator.name == name);
      if (!this.estimations[estimator]) throw new TypeError(`This estimator ${name} does not return a promise or does not exist.`);
      return this.estimations[estimator];
    }
  }
}),
  estimatorable = stampit({
    methods: {
      estimate() {
        throw new TypeError(`${this.name} must implement estimate method`);
      }
    }
  }),
  estimators = {},
  Estimators  = estimatorsable;

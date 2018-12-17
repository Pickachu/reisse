'use strict'
/**
  = Estimators

  Generally it is a set of good rules that try to estimate the conditions with
  which the ocurrence actually happened.

  Eg: The duration estimator infers/deduces the best task duration based on it's tags.
  Eg: The location estimator infers/deduces the location of some ocurrences, based on
  surrounding ocurrences that have location. (aka. checkin ocurrences)

  Note: Ironically estimators serve to estimate actual feature values, not estimated ones.
  They are called `estimator` only because there is a 10% chance of infering error.
  Estimators infer (with at least 90% of confidence) or deduct values (can't be false)

  The estimated feature values are controlled by predictors (not estimators),
  because thehy ae highly especulative (90% or less).

  Also: Estimators deduce the actual feature values for BJFogg conceptual model
  features in it's entirety (for all ocurrences). Because they are mainly virtual
  values based on value judgments.

  Eg: The brain cycles and time estimators estimates the actual BJFogg's
  simplicity brain cycles and time factors.

  TODO perhaps is a great idea to move BJFogg factors estimation to the domain model?

  @type {Estimator}
*/
var estimatorsable = stampit({
  init () {
    this.boundWhen = this.when.bind(this);

    let names = _.uniq(Object.keys(estimators).concat(Object.keys(Estimator.stamps)));

    Estimator.estimators = [];

    // TODO update legacy estimators to use new estimator api
    names.forEach((name) => {
      // if (estimators[name] && !estimators[name].__upgraded) {
      //   estimators[name].fixed.refs.name = name;
      //   Estimator.add(estimators[name]);
      //   estimators[name].__upgraded = true;
      // }
      //
      let estimator = Estimator.get(name, {
        areas: this.areas,
        name: name
      });
      //
      // if (!estimators[name]) estimators[name] = estimator;

      Estimator.estimators.push(estimator);
      this.estimators.push(estimator);
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
        // TODO improve when api, move it to static methods
        estimator.when = this.boundWhen;

        console.log("[estimator] estimating", estimator.name);
        let estimation = estimator.estimate(this.occurrences, this.areas);
        this.estimations.push(estimation);

        Promise.resolve(estimation).then((estimated) => {
          console.log("[estimator] estimated", estimator.name);
          return estimated;
        });
        return estimation;
      });

      let estimates = Promise.all(this.estimations);

      estimates.then(() => console.log('[estimator] finished'));

      return new Promise((resolve, reject) =>
        estimates.then(() => {resolve(this.occurrences)}, reject)
      );
    },
    when () {
      return Promise.all(_(arguments)
        .toArray()
        .map((name) => {
          let index = this.estimators.findIndex((estimator) => estimator.name == name);
          if (!this.estimations[index]) throw new TypeError(`This estimator ${name} does not return a promise or does not exist.`);
          return this.estimations[index];
        })
      ).then((resolutions) => Promise.resolve(resolutions.pop()));
    }
  },
  static: {
    stamps: {},
    estimators: [],
    find (predicate) {
      return this.estimators[predicate] || _.find(this.estimators, predicate) || null;
    },
    get (name, options) {
      if (!this.stamps[name]) throw new TypeError(`Estimator.get: No estimator with ${name} declared yet.`);
      return this[name] = this.stamps[name](options);
    },
    add (stamp) {
      if (this.stamps[name]) throw new TypeError(`Estimator.add: Estimator with ${name} already declared.`);
      this.stamps[stamp.fixed.refs.name] = estimatorable.compose(stamp);
    },
    stage (options) {
      _.each(this.stamps, (stamp, name) => {
        const instance = this.get(name, options);
        this[instance.name] = instance;
        this.estimators.push(instance);
      });
    }
  }
}),
  estimatorable = stampit({
    props: {
      // Stores any estimation skips
      skips: []
    },
    methods: {
      estimate() {
        throw new TypeError(`${this.name} must implement estimate method`);
      },

      // Filter occurrences that allow for 90% accuracy inferrment
      inferrableSet (ocurrences) {
        // We can only infer with 90% accurace from past ocurrences that actually happened
        return ocurrences.filter(({status}) => status === 'complete');
      }
    }
  }),
  estimators = {},
  Estimators  = estimatorsable, // TODO update legacy estimators to use new estimator api
  Estimator   = estimatorsable;

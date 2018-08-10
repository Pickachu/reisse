'use strict';

// = Classifiers
// Classifier names are given by the output they generate
var classifiable = stampit({
  init () { },
  props: {
    // skipped behaviors on prediction or learing for some reason
    skips: []
  },
  methods: {
    stage (ocurrences) {
      this.skips = [];
      // TODO use objective criteria to cache and uncache learning state
      this.learned = false;
    },
    learn (ocurrences) { return Promise.resolve(ocurrences); },
    predict (ocurrences, context) { return Promise.resolve(ocurrences); },
    performate (ocurrences) { },
    quality () { },

    performatableSet (ocurrences) {
      return this.learnableSet(ocurrences.map(Ocurrence.fromJSON, Ocurrence));
    },

    learnableSet (ocurrences, options) {
      let chainable = _(ocurrences), keys = Object.keys(options || {});

      // Only learn from past ocurrences that actualy happened
      chainable = chainable.filter({status: 'complete'});

      if (keys.includes('size')) {
        chainable = chainable.filter((o, i, bs) => i > (options.size * bs.length));
      }

      if (keys.includes('sorted')) {
        chainable = chainable.sortBy('completedAt');
      }

      return chainable.value();
    },

    _validate(set) {
      let example = _.sample(set);
      // Perform simple validations on example
      if (!example || !example.input || !example.output) {
        throw new TypeError('Classifier._train: No example, example input or example output provided');
      }

      if (_.some(example.input.concat(example.output), (activation) => activation < 0 || activation > 1)) {
        throw new RangeError('Classifier._train: input or output activation less than 0 or greater than 1.');
      }
    },

    _train (set, options) {
      this._validate(set);

      let learning = this.network.trainer.train(set, options);

      learning.set = set;
      learning.sampleSize = set.length;
      learning.mapper     = this.mapper;

      return Promise.resolve(learning);
    },

    skip (ocurrence) {
      this.skips.push(ocurrence);
    }
  },
  static: {
    stamps: {},
    classifiers: [],
    find (predicate) {
      return this.classifiers[predicate] || _.find(this.classifiers, predicate) || null;
    },
    get (name, options) {
      return this[name] = this.stamps[name](options);
    },
    add (stamp) {
      this.stamps[stamp.fixed.refs.name] = classifiable.compose(stamp);
    },
    stage (options) {
      _.each(this.stamps, (stamp, name) => {
        let instance = this.get(name, options);
        this[instance.name] = instance;
        this.classifiers.push(instance);
      });
    }
  }
});

var Classifier = classifiable;

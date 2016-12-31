'use strict';

var classifiable = stampit({
  init () { },
  props: {
    // skipped behaviors on prediction or learing for some reason
    skips: []
  },
  methods: {
    stage (ocurrences) { this.skips = []; },
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
      chainable.filter((ocurrence) => ocurrence.status === 'complete');

      if (keys.includes('size')) {
        chainable.filter((o, i, bs) => i > (options.size * bs.length));
      }

      if (keys.includes('sorted')) {
        chainable.sortBy('completedAt');
      }
      
      return chainable.value();
    },

    skip (ocurrence) {
      this.skips.push(ocurrence);
    }
  },
  static: {
    stamps: {},
    classifiers: [],
    find (predicate) {
      return _.find(this.classifiers, predicate);
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

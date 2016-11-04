'use strict';

var classifiable = stampit({
  init () { },
  methods: {
    stage (ocurrences) { },
    learn (ocurrences) { },
    predict (ocurrences, context) { },
    performate (ocurrences) { },
    quality () { },

    performatableSet (ocurrences) {
      return this.learnableSet(ocurrences.map(Ocurrence.fromJSON, Ocurrence));
    },

    learnableSet (ocurrences) {
      // Only learn from past ocurrences that actualy happened
      return ocurrences.filter((ocurrence) => ocurrence.status === 'complete');
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

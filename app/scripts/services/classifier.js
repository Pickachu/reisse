'use strict';

// = Classifiers
// Classifier names are given by the output they generate
var classifiable = stampit({
  init () { },
  props: {

    /**
     * A given name for this classifier. It should be closely related to what
     * the classifiers returns as a prediction in the predict method. So if the
     * returned predictions are activity type's, duration or sensation that is
     * the classifier name. (at least for now :D)
     *
     * @type {String}
     */
    name: undefined,

    /**
     * List of discarded behaviors on predicatable or learnable that for some
     * reason could not be used on the learning proccess or predicting process
     *
     * TODO rename to discards
     *
     * @type {Array}
     */
    skips: [],

    /**
     * An list of options for training each network related classifier with this
     * or a short hand object
     *
     * @type {Object|Array}
     */
    training: {}
  },
  refs: {
    stage({training, relearn = true} = {}) {
      this.skips = [];
      this.training = Object.assign(this.training, training);
      // TODO use objective criteria to cache and uncache learning state
      this.learned = null;
    },

    activate (input) {
      return this.network.activate(input);
    },

    /**
     * This method should receive an array of occurrences and use the occurrence
     * features, properties and context to train it's internal model
     *
     * @param  {Occurrence} occurrences -
     *
     * @return {Promise}             [description]
     */
    async learn (occurrences) { return {}; },

    /**
     * This method should receive an array of occurrences and a context
     * for the given list of occurrences and it should return a list of
     * predictions about this occurrences given this context.
     *
     * It can base it's prediction on any amount of the given occurrences
     * the only it is predicting.
     *
     * This method should always return a prediction. If it can't predict one
     * based on it's inputs, it should return a default prediction.
     *
     * @param  {Occurrence} occurrences -
     * @param  {Object} options - a list of configuration options to the classifier
     * @param  {Context} options.context - the context to be used for open occurrences prediction
     *
     * @return {Object[]} A prediction set
     */
    async predict (occurrences, options) { return []; },

    async performate (occurrences) { },
    quality () { },

    performatableSet (occurrences) {
      return occurrences.map(Ocurrence.fromJSON, Ocurrence);
    },

    learnableSet (occurrences, options) {
      let chainable = _(occurrences);

      const defaulted = Object.assign({}, options, {
        // Only learn from past occurrences that actualy happened
        statuses: ['complete', 'cancel']
      });

      chainable = chainable.filter(({status}) => defaulted.statuses.includes(status));

      if ('size' in defaulted) {
        chainable = chainable.filter((o, i, bs) => i > (options.size * bs.length));
      }

      if ('sorted' in defaulted) {
        chainable = chainable.sortBy('completedAt');
      }

      return chainable.value();
    },

    _validate(set) {
      // Perform simple validations on example
      if (set.length === 0) {
        console.warn(`[classifier.${this.name}._train] training ignored, received an empty set.`);
        return true;
      } else {
        console.info(`[classifier.${this.name}._train] training set size is ${set.length}.`);
        return true;
      }

      const example = _.sample(set);

      // Perform simple validations on example
      if (!example || !example.input || !example.output) {
        throw new TypeError(`[classifier.${this.name}._train] example input or example output provided`);
      }

      if (_.some(example.input.concat(example.output), (activation) => activation < 0 || activation > 1)) {
        throw new RangeError(`[classifier.${this.name}._train] input or output activation less than 0 or greater than 1.`);
      }
    },

    async _train (set, options) {
      this._validate(set);

      // TODO figure out why worker training is not working
      // const learning = await this.network.trainer.trainAsync(set, options);
      const learning = this.network.trainer.train(set, options);

      const activation = this.network.activate(new Array(this.network.layers.input.size).fill(0));
      if (_.isNaN(activation[0])) throw new TypeError(`[classifier:${this.name}:_train]: NaN activation detected!`);

      const classifier = this.network.clone();

      // TODO open issue on synaptic to fix labels
      const labels = this.network.neurons().map(({neuron: {label}}) => label);
      classifier.neurons().forEach(({neuron}, index) => neuron.label = labels[index]);

      return this.learned = Object.assign({set,
        classifier,
        training: Object.assign(this.training, options),
        sampleSize: set.length,
        mapper: this.mapper,
        discards: this.skips.concat([]),
      }, learning);

    },

    skip (occurrence, reason) {
      occurrence.discards.push({classifier: this.name, reason, stage: Re.stage});
      this.skips.push([occurrence, reason]);
    },

    /**
     * Mark behaviors as discarded (cannot be used)
     *
     * @param  {[type]} occurrence [description]
     * @param  {[type]} reason    [description]
     *
     * @return {[type]}           [description]
     */
    discard (occurrence, reason) {
      if (!reason) {
        throw new TypeError(`[classifiar.discard] reason is mandatory`)
      }
      occurrence.discards.push({classifier: this.name, reason, stage: Re.stage});
      this.skips.push([occurrence, reason]);
    }
  },
  static: {
    stamps: {},
    classifiers: [],
    find (predicate) {
      return this.classifiers[predicate] || _.find(this.classifiers, predicate) || null;
    },
    get (name, options) {
      if (!(name in this.stamps)) {
        debugger
      }
      return this[name] = this.stamps[name](options);
    },
    add (stamp) {
      this.stamps[stamp.fixed.refs.name] = classifiable.compose(stamp);
    },
    stage (options) {
      this.classifiers = [];

      _.each(this.stamps, (stamp, name) => {
        let instance = this.get(name, options);
        this[instance.name] = instance;
        this.classifiers.push(instance);
      });
    }
  }
});

var Classifier = classifiable;

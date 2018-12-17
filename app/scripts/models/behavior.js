'use strict';

var behavioral = stampit({
    init () {
      Object.assign(this.features, Feature.many.apply(Feature, [this, ...behavioral.layers]));

      // TODO use mobx-state-tree instead of stampit for models
      if (!this.updatedAt) {
        console.error(`[behavior::init] updated at attribute is mandatory for synchronization. ${this.__firebaseKey__}`);
      }
    },

    props: {
        features: {},

        /**
         * Only for behaviors with status 'complete'. This property holds a copy
         * of the context instance that this behavior have occurred
         *
         * @type {Object}
         */
        context : {},

        /**
         * Array of reasons and stages that this beavior were not used
         *
         * @type {Array}
         */
        discards: [],
    },

    methods: {
        /**
         * This method fetches the full simplicity cost for running
         * this behavior
         *
         * That is, an array with each simplcity cost factor (the higher the factor,
         * lower the simplicity will be, hence ss.min(full) to get simplicity)
         *
         * • Commonality is routine related
         *
         * @param  {[type]} full [description]
         * @param  {[type]} type [description]
         *
         * @return {[type]}      [description]
         */
        simplicity (full, type) {
            type || (type = 'actual');
            let money = 1, time = 1, cycles = 1, effort = 1, commonality = 1;

            time   = 1 - this._neuronized('duration', type);
            cycles = 1 - this._neuronized('brainCycles', type);

            if (time < 0 || time > 1) {
              console.warn(this.__firebaseKey__, 'Behavior.simplicity: invalid time calculated:', time)
              time = 0.5;
            }

            if (cycles < 0 || cycles > 1) {
              console.warn(this.__firebaseKey__, 'Behavior.simplicity: invalid brain cycles calculated:', cycles)
              cycles = 0.5;
            }

            let factors = [money, time, cycles, effort, commonality];
            if (factors.filter(Number.isFinite).length != factors.length) {debugger};

            // console.log("name", this.name);
            // console.log("money:", money, "time:", time, "cycles:", cycles, "effort:", effort, "social:", social, "commonality:", commonality);

            return factors;
        },

        motivation (full, type) {
            type || (type = 'actual')

            // TODO change estimated hour based on task cumulative distribution for the day
            let sensation  = this.features.sensation[type],
              anticipation = this.features.anticipation[type],
              belonging    = this._neuronized('belongness', type);

            // console.log("sensation:", sensation, "anticipation:", anticipation, "belonging:", belonging);
            let factors = [sensation, anticipation, belonging];
            if (factors.filter(Number.isFinite).length != factors.length) {debugger};

            return factors;
        },

        // TODO Save behavior specie on database
        // TODO move to specieable
        createSpecie () {
          var hasher  = Hash.Sim;
          specie      = hasher.simhash(this.name || "");
          return specie;
        },

        // Converts feature value to an value between 0 and 1 for the neural net
        // TODO learn to use softmax
        // TODO treat special cases (Alboomização is an occurrence with 2 week duration and normalizes all durations badly)
        _neuronized (feature, type) {
          let key = `${feature}_${type}`,
           value  = +this.features[feature][type] || 0,
           maximum = Feature.aggregates.maximums[key];
           // minimum = Feature.aggregates.minimums[key];

          // TODO mark this feature as valueless
          if (value === -1) return 0;


          // Convert
          return value / maximum;
        },

        // TODO increase daytime prediction success rate
        // _hour () {
        //   return ((this.completedAt) ? this.completedAt.getHours() : Behavior.currentHour) / 23
        // }
        toJSON () {
          let features = JSON.stringify(this.features),
          cloned = _.cloneDeep(this);
          cloned.features = JSON.parse(features);
          return cloned;
        }
    },
    static: {
      layers: (function () {
        let layers = [];
        layers = layers.concat(['chance']);
        layers = layers.concat(['motivation', 'simplicity']);
        layers = layers.concat([
          'anticipation', 'sensation', 'belongness',
          // TODO rename brainCycles to mentalEffort
          'money', 'time', 'routine', 'brainCycles', 'physicalEffort'
        ]);
        return layers;
      })()
    }
});

var Behavior = behavioral.compose(awarable);

// Behavior.currentHour = new Date().getHours()

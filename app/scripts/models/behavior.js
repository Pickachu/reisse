'use strict';

var behavioral = stampit({
    init () {
        Object.assign(this.features, Feature.many(this, 'chance', 'motivation', 'simplicity', 'anticipation', 'belongness'));
    },

    props: {
        features: {},
        context : {}
    },

    methods: {
        // Commonality is routine related
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

            // console.log("name", this.name);
            // console.log("money:", money, "time:", time, "cycles:", cycles, "effort:", effort, "social:", social, "commonality:", commonality);

            return [money, time, cycles, effort, commonality];
        },

        motivation (full, type) {
            type || (type = 'actual')

            // TODO change estimated hour based on task cumulative distribution for the day
            let sensation  = 0,
              anticipation = this.features.anticipation[type],
              belonging    = this._neuronized('belongness', type);

            // console.log("sensation:", sensation, "anticipation:", anticipation, "belonging:", belonging);
            return [sensation, anticipation, belonging];
        },

        // TODO Save behavior specie on database
        createSpecie () {
          var hasher  = Hash.Sim;
          specie      = hasher.simhash(this.name || "");
          return specie;
        },

        // Converts feature value to an value between 0 and 1 for the neural net
        // TODO learn to use softmax
        _neuronized (feature, type) {
          let key = `${feature}_${type}`,
           value  = +this.features[feature][type] || 0,
           maximum = Feature.aggregates.maximums[key];
           // minimum = Feature.aggregates.minimums[key];

          // TODO mark this feature as valueless
          if (value === -1) return 0;


          // Convert
          return value / maximum;
        }

        // TODO increase daytime prediction success rate
        // _hour () {
        //   return ((this.completedAt) ? this.completedAt.getHours() : Behavior.currentHour) / 23
        // }

    }
}), Behavior = behavioral;

// Behavior.currentHour = new Date().getHours()

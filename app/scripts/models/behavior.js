'use strict';

var behavioral = stampit({
    init () {
        Object.assign(this.features, Feature.many(this, 'chance', 'motivation', 'simplicity'));
    },
    props: {
        features: {}
    },

    methods: {
        simplicity (full, type) {
            type || (type = 'actual');
            let money = 1, time = 1, cycles = 1, effort = 1, social = 1, routine = 1;

            time   = 1 - this._neuronized('duration', type);
            cycles = 1 - this._neuronized('brainCycles', type);

            // console.log("name", this.name);
            // console.log("money:", money, "time:", time, "cycles:", cycles, "effort:", effort, "social:", social, "routine:", routine);

            return [money, time, cycles, effort, social, routine];
        },

        motivation (full, type) {
            type || (type = 'actual')

            var sensation = 0, anticipation = 0, belonging = 0;

            // console.log("sensation:", sensation, "anticipation:", anticipation, "belonging:", belonging);
            return [sensation, anticipation, belonging];
        },

        // Converts feature value to an value between 0 and 1 for the neural net
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

    }
}), Behavior = behavioral;

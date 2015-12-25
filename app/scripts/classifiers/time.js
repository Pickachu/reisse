'use strict'

var Classifiers = Classifiers || (Classifiers = {})

var timeable = stampit({

});

Classifiers.Time = stampit({
    init() {
        let Architect    = synaptic.Architect;
        this.time        = new Architect.Perceptron(2, 3, 1);
        this.durationMap = new Map();
    },
    methods: {
        learn(behaviors) {
            let set = [];

            behaviors.forEach((behavior) => {
                let duration = behavior.features.duration;

                if (duration.relative && duration.actual) {
                    let value = this.durationMap.get(duration.relative) || [];
                    value.push(duration.actual);
                    this.durationMap.set(duration.relative, value);
                }
            });

            // behaviors.forEach((behavior) => {
            //     let duration = behavior.features.duration,
            //         output = duration.actual || this.timeFromRelativeDuration(duration.relative)

            //     // Skip behaviors without enough information to estimate
            //     if (!output) return;

            //     set.push({
            //         inputs: [],
            //         output: [duration.actual || this.timeFromRelativeDuration(duration.relative)]
            //     });
            // });

            // this.behaviors = behaviors;
        },
        predict(behaviors) {
            behaviors.forEach((behavior) => {
                let duration = behavior.features.duration,
                    output = duration.actual || this.timeFromRelativeDuration(duration.relative)

                duration.estimated = output || -1;
            });

        },
        timeFromRelativeDuration(relativeDuration) {
            let time = ss.mean(this.durationMap.get(relativeDuration));
        }
    }
});

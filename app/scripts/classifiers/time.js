'use strict';

var Classifiers = Classifiers || (Classifiers = {});

Classifiers.Time = stampit({
    init() {
        // let Architect    = synaptic.Architect;
        // this.time        = new Architect.Perceptron(2, 3, 1);
        this.durationMap = new Map();
        this.durationMap.set('unknowns', []);
    },
    methods: {
        learn(behaviors) {
            let set = [], finite = Number.isFinite;

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
                    output   = duration.actual;

                duration.estimated = output || 0;
            });

        }
    }
});

// Implementation of https://workflowy.com/#/1866981390e0
'use strict';
var Classifiers = Classifiers || (Classifiers = {})

Classifiers.Chance = stampit({
    static: {
        initialize () {
            let Architect   = synaptic.Architect
            this.chance     = new Architect.Perceptron(2, 3, 1);
            this.motivation = new Architect.Perceptron(3, 3, 1);
            this.simplicity = new Architect.Perceptron(6, 3, 1);

            this.simplicity.time = Classifiers.Time()

            this.motivation.project(this.chance);
            this.simplicity.project(this.chance);
        },
        learn (ocurrences) {
            let sets = {
                chance    : [],
                motivation: [],
                simplicity: []
            };

            console.log('classifier: learning');
            this.simplicity.time.learn(ocurrences);

            ocurrences.forEach( (ocurrence) => {
                if (ocurrence.features.chance.actual === null) throw new TypeError("No chance provided for ocurrence.", ocurrence);
                ocurrence = Ocurrence.fromJSON(ocurrence);

                let inputs = [
                    this.simplicity.activate(ocurrence.simplicity(true, 'actual')),
                    this.motivation.activate(ocurrence.motivation(true, 'actual'))
                ];

                sets.chance.push({
                    input: inputs,
                    output: [ocurrence.features.chance.actual]
                });
            }, this);

            console.log('classifier: training');
            this.chance.trainer.train(sets.chance);
        },

        predict (behaviors) {
            this.simplicity.time.predict(behaviors);

            behaviors.forEach( (behavior) => {
                let features = behavior.features;

                features.simplicity.estimated = this.simplicity.activate(behavior.simplicity(true, 'truer'));
                features.motivation.estimated = this.motivation.activate(behavior.motivation(true, 'truer'));

                features.chance.estimated = this.chance.activate([
                    features.simplicity.estimated,
                    features.motivation.estimated
                ]);
            });
        }
    }

});

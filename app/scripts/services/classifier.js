// Implementation of https://workflowy.com/#/1866981390e0
'use strict';

var Classifier = stampit({
    static: {
        initialize () {
            let Architect   = synaptic.Architect
            this.chance     = new Architect.Perceptron(2, 3, 1);
            this.motivation = new Architect.Perceptron(3, 3, 1);
            this.simplicity = new Architect.Perceptron(6, 3, 1);

            this.motivation.project(this.chance);
            this.simplicity.project(this.chance);
        },
        learn (ocurrences) {
            let sets = {
                chance    : [],
                motivation: [],
                simplicity: []
            };

            console.log('learning');

            ocurrences.forEach( (ocurrence) => {
                if (ocurrence.features.chance.actual === null) throw new TypeError("No chance provided for ocurrence.", ocurrence);

                let inputs = [
                    this.simplicity.activate(ocurrence.simplicity(true, 'actual')),
                    this.motivation.activate(ocurrence.motivation(true, 'actual'))
                ];

                sets.chance.push({
                    input: inputs,
                    output: [ocurrence.features.chance.actual]
                });
            }, this);

            console.log('training');
            this.chance.trainer.train(sets.chance);
        },

        predict (ocurrences) {
            ocurrences.forEach( (ocurrence) => {
                ocurrence.features.chance.estimated = this.chance.activate([
                    this.simplicity.activate(ocurrence.simplicity(true, 'truer')),
                    this.motivation.activate(ocurrence.motivation(true, 'truer'))
                ]);
            });
        }
    }

});

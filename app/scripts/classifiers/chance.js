// Implementation of https://workflowy.com/#/1866981390e0
'use strict';
var Classifiers = Classifiers || (Classifiers = {});

Classifiers.Chance = stampit({
  static: {
    stage () {
      let Architect   = synaptic.Architect;
      this.chance     = new Architect.Perceptron(2, 3, 1);
      this.simplicity = Classifiers.Simplicity({chance: this.chance, areas: this.areas});
      this.motivation = Classifiers.Motivation({chance: this.chance, areas: this.areas});
    },
    learn (ocurrences) {
      return this.simplicity.learn(ocurrences)
        .then(Promise.resolve(this.motivation.learn(ocurrences)))
        .then(() => {
          let set;
          ocurrences = ocurrences.filter((ocurrence) => Number.isFinite(ocurrence.features.chance.actual));
          console.log('classifier: learning chance from', ocurrences.length, 'ocurrences');

          set = ocurrences.map((ocurrence) => {
            ocurrence = Ocurrence.fromJSON(ocurrence);

            let inputs = [
              this.simplicity.perceptron.activate(ocurrence.simplicity(true, 'actual')),
              this.motivation.perceptron.activate(ocurrence.motivation(true, 'actual'))
            ];

            // Validate actual chance distribution space
            // (x - 1.1) ^ 2 + (y - 1.1) ^ 2 - 1 = 0
            return {
              input: inputs,
              output: [ocurrence.features.chance.actual]
            };
          }, this);

          this.chance.trainer.train(set, {log: 1000, iterations: 5000});
          console.log('classifier: learned');
        });
    },

    predict (behaviors) {
      this.motivation.context = this.context;
      this.motivation.predict(behaviors);

      this.simplicity.context = this.context;
      this.simplicity.predict(behaviors);

      behaviors.forEach( (behavior) => {
        let features = behavior.features;

        features.chance.estimated = this.chance.activate([

          features.simplicity.estimated,
          features.motivation.estimated

        ])[0];

        if (_.isNaN(features.chance.estimated)) {
          throw new TypeError(`Classifiers.Chance.predict: Chance prediction with NaN for an ocurrence!`);
        };
      });
    }
  }
});

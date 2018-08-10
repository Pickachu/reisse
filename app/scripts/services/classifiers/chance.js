// Implementation of https://workflowy.com/#/1866981390e0
'use strict';

Classifier.add(stampit({
  refs: {
    name: 'chance'
  },
  init () { this.stage() },
  methods: {
    stage () {
      let Architect   = synaptic.Architect;
      this.perceptron = new Architect.Perceptron(2, 3, 1);
      this.simplicity = Classifier.simplicity
      this.motivation = Classifier.motivation
    },
    learn (ocurrences) {
      return this.simplicity.learn(ocurrences)
        .then(this.motivation.learn(ocurrences))
        .then(() => {
          let set;
          ocurrences = ocurrences.filter((ocurrence) => Number.isFinite(ocurrence.features.chance.actual));
          console.log('classifier: learning chance from', ocurrences.length, 'ocurrences');

          set = _(ocurrences)
            .map((ocurrence) => {
              // TODO Treat learning of already started behaviors but unfinished
              if (ocurrence.status == 'open') return;
              ocurrence = Ocurrence.fromJSON(ocurrence);

              // TODO get learning from ocurrence instead of simplicity prediction
              let inputs = [
                ss.min(ocurrence.simplicity(true, 'actual')),
                this.motivation.perceptron.activate(ocurrence.motivation(true, 'actual'))[0]
              ];

              // Validate actual chance distribution space
              // (x - 1.1) ^ 2 + (y - 1.1) ^ 2 - 1 = 0
              return {
                input: inputs,
                output: [ocurrence.features.chance.actual]
              };
            })
            .compact()
            .value();

          this.perceptron.trainer.train(set, {log: 100, iterations: 1000});

          var activation = this.perceptron.activate([0,0]);
          if (_.isNaN(activation[0])) throw new TypeError("Classifier.Chance.learn: NaN activation detected!");

          console.log('classifier: learned');
        });
    },

    predict (behaviors) {
      this.motivation.context = this.simplicity.context = this.context;

      return Promise.all([
        this.motivation.predict(behaviors),
        this.simplicity.predict(behaviors)
      ]).then(() => {
        behaviors.forEach( (behavior) => {
          let features = behavior.features;

          features.chance.estimated = this.perceptron.activate([

            features.simplicity.estimated,
            features.motivation.estimated

          ])[0];

          if (_.isNaN(features.chance.estimated)) {
            throw new TypeError(`Classifier.Chance.predict: Chance prediction with NaN for an ocurrence!`);
          };
        });
      });
    }
  }
}));

'use strict'
var Classifiers = Classifiers || (Classifiers = {});

Classifiers.Motivation = stampit({
    init() {
      let Architect   = synaptic.Architect;
      this.perceptron = new Architect.Perceptron(3, 6, 1);

      // TODO move to sensation
      this.sleep      = Classifiers.Sleep();

      return this;
    },
    methods: {
      learn(behaviors) {
        console.log('learning motivation');
        let set = [], finite = Number.isFinite, learning;

        // TODO use simplicity of daytime to validate minimum motivation required
        // if a task is X in simplicity, it requires at least inverseBjFoggConceptualCurve(x) motivation

        this.sleep.learn(behaviors);

        set = behaviors.map((behavior) => {
          let factors = behavior.motivation(true, 'actual');

          return {
            input:  factors,
            output: [ss.average(factors)]
          }
        });

        // Train network
        learning = this.perceptron.trainer.train(set, {log: 100, rate: 0.2, iterations: 1000});

        // TODO move this code to base classifiers stamp (not created yet) and test all neural net for nan inputs
        var activation = this.perceptron.activate([0,0,0]);
        if (_.isNaN(activation[0])) throw new TypeError("Classifiers.Simplicity.learn: NaN activation detected!");

        learning.set = set;
        learning.sampleSize = set.length;
        return Promise.resolve(learning);
      },
      predict(behaviors) {
        this.sleep.context = this.context;
        this.sleep.predict(behaviors);

        behaviors.forEach((behavior) => {
          behavior.features.motivation.estimated = this.perceptron.activate(behavior.motivation(true, 'truer'))[0];
        });
      }
    }
});

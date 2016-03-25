'use strict'
var Classifiers = Classifiers || (Classifiers = {});

Classifiers.Motivation = stampit({
    init() {
      let Architect   = synaptic.Architect;

      this.perceptron = new Architect.Perceptron(4, 6, 1);
      this.perceptron.project(this.chance);

      return this;
    },
    methods: {
        learn(behaviors) {
          let set = [], finite = Number.isFinite;

          // TODO use simplicity of daytime to validate minimum motivation required
          // if a task is X in simplicity, it requires at least inverseBjFoggConceptualCurve(x) motivation

          behaviors.forEach((behavior) => {
            let factors = behavior.simplicity(true, 'actual');
            this.perceptron.activate(factors);
            this.perceptron.propagate(0.2, [ss.average(factors)]);
          });

        },
        predict(behaviors) {
          behaviors.forEach((behavior) => {
            behavior.features.motivation.estimated = this.perceptron.activate(behavior.motivation(true, 'truer'))[0];
          });
        }
    }
});

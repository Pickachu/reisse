// 'use strict'

var Classifiers = Classifiers || (Classifiers = {});

Classifiers.Simplicity = stampit({
    init() {
      let Architect   = synaptic.Architect;

      this.time = Classifiers.Time();

      this.perceptron = new Architect.Perceptron(5, 6, 6, 1);

      return this;
    },
    methods: {
        learn(behaviors) {
          let set = [], finite = Number.isFinite;

          // this.time.learn(behaviors);

          behaviors.forEach((behavior) => {
            let factors = behavior.simplicity(true, 'actual');
            this.perceptron.activate(factors);
            this.perceptron.propagate(0.2, [ss.average(factors)]);
          });

          behaviors.forEach((behavior) => {
            let factors = behavior.simplicity(true, 'actual');
            behavior.features.simplicity.estimated = this.perceptron.activate(factors);
          });
        },
        predict(behaviors) {
            // behaviors.forEach((behavior) => {
            //     let duration = behavior.features.duration,
            //         output   = duration.actual;
            //
            //     duration.estimated = output || -1;
            // });
        }
    }
});

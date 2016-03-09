'use strict'

var Classifiers = Classifiers || (Classifiers = {})

// Not used yet
Classifiers.Simplicity = stampit({
    init() {
      let Architect   = synaptic.Architect

      this.time = Classifiers.Time()

      this.perceptron = new Architect.Perceptron(6, 3, 1);
      this.perceptron.project(this.chance);

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

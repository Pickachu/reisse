// 'use strict'

var Classifiers = Classifiers || (Classifiers = {});

Classifiers.Simplicity = stampit({
    init() {
      let Architect   = synaptic.Architect;

      this.time = Classifiers.Time();

      this.perceptron = new Architect.Perceptron(6, 6, 6, 1);
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
            console.error('update backpropagation to take into account predicted minimum simplicity of task relevance on fuzzy daytime')
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

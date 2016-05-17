'use strict';

var Classifiers = Classifiers || (Classifiers = {});

Classifiers.Sensastion = stampit({
    init () {
      let Architect   = synaptic.Architect;

      // TODO use homeostasis classifier?
      this.sleep = Classifiers.Sleep({areas: this.areas});
    },
    methods: {
        learn(behaviors) {
          this.sleep.learn(behaviors);
        },
        predict(behaviors) {
          // behaviors.forEach((behavior) => {
          //     this.sleep.perceptron.activate();
          // });
        }
    }
});

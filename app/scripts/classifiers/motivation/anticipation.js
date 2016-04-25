'use strict';

var Classifiers = Classifiers || (Classifiers = {});

Classifiers.Anticipation = stampit({
    init () {
      let Architect   = synaptic.Architect;

      // TODO use anticipation classifier
      this.responsibilityArea = Classifiers.ResponsibilityArea({areas: this.areas});
    },
    methods: {
        learn(behaviors) {
          this.responsibilityArea.learn(behaviors);
        },
        predict(behaviors) {
          behaviors.forEach((behavior) => {
              this.responsibilityArea.perceptron.activate();
          });
        }
    }
});

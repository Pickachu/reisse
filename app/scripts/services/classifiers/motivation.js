'use strict'

Classifier.add(stampit({
  refs: {
    name: 'motivation'
  },
  init() {
    let Architect     = synaptic.Architect;
    this.perceptron   = new Architect.Perceptron(3, 6, 1);
    this.anticipation = Classifier.anticipation
    this.sensation    = Classifier.sensation

    return this;
  },
  methods: {
    learn(behaviors) {
      console.log('learning motivation');
      let set = [], finite = Number.isFinite, learning;

      // TODO use simplicity of daytime to validate minimum motivation required
      // if a task is X in simplicity, it requires at least inverseBjFoggConceptualCurve(x) motivation

      set = _(behaviors)
        .map((behavior) => {
          // TODO Treat already started behaviors
          if (behavior.status == 'open') return;
          let factors = behavior.motivation(true, 'actual');

          return {
            input:  factors,
            output: [ss.average(factors)]
          }
        })
        .compact()
        .value();

      // Train network
      learning = this.perceptron.trainer.train(set, {log: 2, rate: 0.2, iterations: 10});

      // TODO move this code to base classifiers stamp (not created yet) and test all neural net for nan inputs
      let activation = this.perceptron.activate([0,0,0]);
      if (_.isNaN(activation[0])) throw new TypeError("Classifier.Simplicity.learn: NaN activation detected!");

      learning.set = set;
      learning.sampleSize = set.length;
      return Promise.resolve(learning);
    },
    predict(behaviors) {
      this.sensation.context = this.anticipation.context = this.context;

      return Promise.all([
        this.sensation.predict(behaviors),
        this.anticipation.predict(behaviors)
      ]).then((resolutions) => {
        behaviors.forEach((behavior, index) => {
          behavior.features.sensation.estimated    = resolutions[0][index];
          behavior.features.anticipation.estimated = resolutions[1][index];
        });

        behaviors.forEach((behavior) => {
          behavior.features.motivation.estimated = this.perceptron.activate(behavior.motivation(true, 'truer'))[0];
        });

      });
    }
  }
}));

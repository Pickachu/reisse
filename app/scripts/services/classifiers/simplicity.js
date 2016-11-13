'use strict'

Classifier.add(stampit({
  refs: {
    name: 'simplicity'
  },
  init () { this.stage() },
  methods: {
    stage() {
      let Architect   = synaptic.Architect;

      this.perceptron = new Architect.Perceptron(5, 6, 6, 1);

      return this;
    },
    @ TODO remove neural network
    learn(behaviors) {
      console.log('learning simplicity');
      let set = [], mapper = this._createMapper(behaviors), learning;


      set = behaviors.map((behavior) => {
        return {
          input : mapper.input(behavior),
          output: mapper.output(behavior)
        };
      });

      // Train network
      learning = this.perceptron.trainer.train(set, {log: 100, rate: 0.2, iterations: 1000});

      // TODO move this code to base classifiers stamp (not created yet) and test all neural net for nan inputs
      var activation = this.perceptron.activate([0,0,0,0,0]);
      if (_.isNaN(activation[0])) throw new TypeError("Classifier.Simplicity.learn: NaN activation detected!");

      learning.set = set;
      learning.sampleSize = set.length;
      return Promise.resolve(learning);
    },
    predict(behaviors) {
      let mapper = this._createMapper(behaviors);
      behaviors.forEach((behavior) => {
        let input = mapper.input(behavior, 'truer');
        behavior.features.simplicity.estimated = this.perceptron.activate(input)[0];
      });

      return Promise.resolve(behaviors);
    },
    performate (behaviors) {
      let learnable;

      this.stage();

      // TODO better integration of Re estimatives
      return Re.estimate(behaviors, app.areas.concat())
        .then((estimated) => learnable = this.performatableSet(estimated))
        .then(this.learn.bind(this))
        .then((learning) => {
          let mapper = this._createMapper(learnable),
            factors = ['money', 'time', 'cycles', 'effort', 'commonality'],
            baseInput = _.fill(Array(factors.length), 0);

          return _(factors)
            .map((factor, index) => {
              let values = [], cursor = 0, output, input = baseInput.concat(), data = [];

              while (cursor < 1) {
                input[index] = cursor;

                values.push({
                  // simplicity value output
                  x: mapper.denormalize(this.perceptron.activate(input)),
                  // simplicity factor activation
                  y: cursor
                });

                cursor += 0.05;
              }

              data.push({
                key: 'Predicted ' + factor,
                values: values
              });

              data.push(_(learnable)

                .map((behavior) => {
                  let input   = mapper.input(behavior);

                  return {
                    x: mapper.denormalize(this.perceptron.activate(input)),
                    y: input[index]
                  };
                })
                .groupBy((dot) => dot.y.toFixed(2))
                .map((group) => {return {x: group[0].x, y: group[0].y, size: group.length}})
                .thru((values) => {return {key: "Actual " + factor, values: values};})
                .value());

              learning.title = _.upperFirst(factor);
              learning.options = {
                axis: {
                  x: {axisLabel: 'Simplicity Activation'},
                  y: {axisLabel: _.upperFirst(factor) + ' Factor'}
                }
              }
              return {data: data, meta: _.clone(learning), type: 'scatter'};
            })
            .thru((datas) => {return {graphs: datas}})
            .value();
      });
    },
    _createMapper (behaviors, type) {
      return {
        // TODO remove simplicity method from behavior
        input(behavior, type) {
          type || (type = 'actual');
          return behavior.simplicity(true, type);
        },
        output(behavior, type) {
          type || (type = 'actual');
          return [ss.min(behavior.simplicity(true, type))];
        },
        denormalize(output) {
          return parseFloat(output[0].toFixed(4)) * 100;
        }
      };
    },
  }
}));

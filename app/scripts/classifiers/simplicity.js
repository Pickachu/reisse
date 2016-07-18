// 'use strict'

var Classifiers = Classifiers || (Classifiers = {});

Classifiers.Simplicity = stampit({
  init () { this.stage() },
  methods: {
    stage() {
      let Architect   = synaptic.Architect;

      this.time = Classifiers.Time();
      this.perceptron = new Architect.Perceptron(5, 6, 6, 1);

      return this;
    },
    learn(behaviors) {
      console.log('learning simplicity');
      let set = [], finite = Number.isFinite;

      set = behaviors.map((behavior) => {
        let factors = behavior.simplicity(true, 'actual');

        return {
          input : factors,
          output: [ss.average(factors)]
        };
      });

      // Train network
      this.perceptron.trainer.train(set, {log: 1000, rate: 0.2, iterations: 5000});

      // TODO move this code to base classifiers stamp (not created yet) and test all neural net for nan inputs
      var activation = this.perceptron.activate([0,0,0,0,0]);
      if (_.isNaN(activation[0])) throw new TypeError("Classifiers.Simplicity.learn: NaN activation detected!");

      return Promise.resolve(behaviors);
    },
    predict(behaviors) {
      behaviors.forEach((behavior) => {
        let input = behavior.simplicity(true, 'truer');
        behavior.features.simplicity.estimated = this.perceptron.activate(input)[0];
      });

      return Promise.resolve(behaviors);
    },
    performate (behaviors) {
      let area, input, output, learning,
        mapper, predicted = {key: 'Predicted Simplicity', values: []},
        actual = {key: 'Actual Simplicity', values: []},
        learnable = Re.learnableSet(behaviors);

      this.stage();
      return this.learn(learnable).then((learning) => {
        mapper = this._createMapper(learnable);

        _(learnable)
          .each((behavior) => {
            input = mapper.input(behavior);
            // area  = this.areas[this.areaIds.indexOf(behavior.areaId)];

            output      = this.perceptron.activate(input);
            predicted.values.unshift({
              x: behavior.createdAt,
              y: mapper.denormalize(output)
            });

            actual.values.unshift({
              x: behavior.createdAt,
              y: mapper.output(behavior.features.duration.actual)
            });
          })
          .value();

        var sort = (a, b) => a.y - b.y
        predicted.values.sort(sort);
        actual.values.sort(sort);

        actual.values.forEach((v, i) => {
          actual.values[i].x = predicted.values[i].x = i;
        });

        learning.sampleSize = actual.values.length;
        return {data: [predicted, actual], stats: learning, type: 'scatter'};
      });
    },
    _createMapper (behaviors) {

      return {
        areaIds: this.areaIds,
        areasLength: this.areas.length,
        maximumDuration: Feature.aggregates.maximums.duration_actual,
        hasher: Hash.Sim,
        mappedSimilarityHash (string) {
          return this.hasher.createBinaryArray(this.hasher.simhash(string));
        },
        output(behavior) {
          let duration = behavior.features.duration, output = [];

          if (Number.isFinite(duration.actual)) {
            output.push(duration.actual / this.maximumDuration)
          } else {
            output.push(this._durationFromSimilar(behavior, behaviors))
          }

          if (output[0] > 1) {
            console.warn("Invalid normalization for behavior! Will normalize to 1");
            output[0] = 1;
          }

          return output;
        },
        input(behavior) {
          let input = [];

          if (behavior.start) {
            input.push(behavior.start.getHours() / 23);
          } else {
            input.push(0.5);
          }

          if (behavior.end) {
            input.push(behavior.end.getHours() / 23);
          } else {
            input.push(0.5);
          }

          input.push(this.areaIds.indexOf(behavior.areaId) / this.areasLength);

          input = input.concat(this.mappedSimilarityHash(behavior.name || ''));
          if (input[1] > 1 || input[1] < 0) {
            throw new TypeError("Invalid input normalization");
          }
          return input;
        },
        denormalize(output) {
          return output[0] * this.maximumDuration
        }
      };
    },
  }
});

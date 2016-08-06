'use strict';

var Classifiers = Classifiers || (Classifiers = {});

// TODO Calculate neural net accuracy
Classifiers.Duration = stampit({
  init() {
    // FIXME forwardable properties to reisse classifiers
    this.areas || (this.areas = app.areas);
    this.stage();
  },
  methods: {
    stage () {
      let Architect   = synaptic.Architect;
      this.perceptron = new Architect.LSTM(35, 6, 8, 6, 1);
      this.areaIds = this.areas.map((area) => area.provider.id);
    },
    learn(behaviors) {
      let set = [], finite = Number.isFinite, mapper;
      console.log('learning duration');
      // TODO create task type

      mapper = this._createInputMapper(behaviors);

      behaviors.forEach((behavior) => {
        let duration = behavior.features.duration, inputs,
            seconds  = duration.actual;

        // Skip behaviors without enough information to estimate
        if (!finite(seconds)) return;
        if (!behavior.areaId) return;
        // TODO identify relevante long duration behaviors! (eg: Sleep)
        if (duration.actual > 360 * 60) return;
        if (duration.actual < 0) {
          return console.warn('Skipping duration with negative value!', behavior.name, duration.actual)
        };

        set.push({
            input : mapper.input( behavior),
            output: mapper.output(behavior)
        });
      });

      return new Promise((finished) => {
        // Train network
        let train = (learning) => {
          if (set.length) {
            console.log('learning duration remaining', set.length);
            new Promise((resolve) => {
              this.perceptron.trainer.workerTrain(set.splice(0, 500), resolve, {iterations: 10, log: 2, rate: 0.75});
            }).then(train);
          } else {
            console.log('learned duration')
            finished(learning);
          }
        };

        train();
      });
    },
    predict(behaviors) {
      let mapper = this._createInputMapper(behaviors), total = behaviors.length;
      behaviors.forEach((behavior, index) => {
        if (!(index % 1000)) console.log('predicting duration', index, 'of', total, 'Sample:', behavior.name, 'Predicted Duration:', mapper.denormalize(this.perceptron.activate(mapper.input(behavior))));
        behavior.features.duration.estimated = mapper.denormalize(this.perceptron.activate(mapper.input(behavior)));
      });
    },
    performate (behaviors) {
      let mapper, predicted = {key: 'Predicted Duration', values: []},
        actual = {key: 'Actual Duration', values: []},
        estimator = estimators.duration();

      // TODO let duration prediction to 60% accuracy

      this.stage();

      estimator.estimate(behaviors.map(Ocurrence.fromJSON, Ocurrence));

      return estimator.estimation
        .then((learnable) => {
          mapper = this._createInputMapper(learnable);
          return this.learn(learnable);
        })
        .then((learning ) => {

          _(behaviors)
            .map(Ocurrence.fromJSON, Ocurrence)
            .map((behavior, index) => {
              let value = {}, input, output;
              if (!behavior.areaId) return;
              if (!(index % 1000)) console.log('predicting duration', index, 'of', behaviors.length, 'Sample:', behavior.name);

              // TODO identify relevante long duration behaviors! (eg: Sleep)
              if (behavior.features.duration.actual > 360 * 60) return;

              if (behavior.features.duration.actual < 0) return;

              input = mapper.input(behavior);
              // TODO area  = this.areas[this.areaIds.indexOf(behavior.areaId)];

              output          = this.perceptron.activate(input);
              value.hash      = mapper.hasher.simhash(behavior.name);
              value.predicted = mapper.denormalize(output) / 60;

              if (!Number.isFinite(behavior.features.duration.actual)) return value;
              value.actual = behavior.features.duration.actual / 60

              return value;
            })
            .compact()
            .sort((a, b) => a.predicted - b.predicted)
            .tap((values) => {
              var index = 0;

              for (var i = 0; i < values.length; i++) {
                if (!values[i].actual) continue;

                index++
                predicted.values.push({
                  x: index,
                  y: values[i].predicted
                });

                actual.values.push({
                  x: index,
                  y: values[i].actual
                });
              }

              for (var i = 0; i < values.length; i++) {
                if (values[i].actual) continue;

                index++;
                predicted.values.push({
                  x: index,
                  y: values[i].predicted
                });
              }

            })
            .value()

          learning.sampleSize = actual.values.length;
          return {data: [predicted, actual], stats: learning, type: 'scatter'};
        });
    },
    _createInputMapper (behaviors) {
      let classifier = this;

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
    }
  }
});

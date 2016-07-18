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
            seconds  = duration.actual

        // Skip behaviors without enough information to estimate
        if (!finite(seconds)) return;
        if (!behavior.areaId) return;
        // TODO identify relevante long duration behaviors! (eg: Sleep)
        if (duration.actual > 360 * 60) return;

        set.push({
            input : mapper.input( behavior),
            output: mapper.output(behavior)
        });
      });

      // Train network
      return new Promise ((resolve) => {
        this.perceptron.trainer.workerTrain(set, resolve, {iterations: 10, log: 2, rate: 0.75});
      });
    },
    predict(behaviors) {
      let mapper = this._createInputMapper(behaviors);
      behaviors.forEach((behavior) => {
          behavior.features.duration.estimated = mapper.denormalize(this.perceptron.activate(mapper.input(behavior)));
      });
    },
    performate (behaviors) {
      let area, input, output, learning,
        mapper, predicted = {key: 'Predicted Duration', values: []},
        actual = {key: 'Actual Duration', values: []},
        learnable = Re.learnableSet(behaviors);

      // TODO let duration prediction to 60% accuracy

      this.stage();
      return this.learn(learnable).then((learning) => {
        mapper = this._createInputMapper(learnable);

        _(learnable)
          .each((behavior) => {
            if (!behavior.areaId) return;
            if (!Number.isFinite(behavior.features.duration.actual)) return;
            // TODO identify relevante long duration behaviors! (eg: Sleep)
            if (behavior.features.duration.actual > 360 * 60) return;

            input = mapper.input(behavior);
            // TODO area  = this.areas[this.areaIds.indexOf(behavior.areaId)];

            output      = this.perceptron.activate(input);
            predicted.values.unshift({
              x: mapper.hasher.simhash(behavior.name),
              y: mapper.denormalize(output) / 60
            });

            actual.values.unshift({
              x: mapper.hasher.simhash(behavior.name),
              y: behavior.features.duration.actual / 60
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

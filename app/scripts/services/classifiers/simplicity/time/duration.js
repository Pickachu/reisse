'use strict';

// TODO Calculate neural net accuracy
Classifier.add(stampit({
  refs: {
    name: 'duration'
  },
  init() {
    // FIXME forwardable properties to reisse classifiers
    this.areas || (this.areas = app.areas);
    this.stage();
  },
  methods: {
    stage () {
      let Architect   = synaptic.Architect;
      // this.perceptron = new Architect.LSTM(35, 6, 8, 6, 1);
      this.areaIds = this.areas.map((area) => area.provider.id);
    },
    learn(behaviors) {
      let set = [], dict = new Map(), finite = Number.isFinite;

      _(behaviors)
        .filter('name')
        .map((behavior) => {
          let duration = behavior.features.duration;

          if (!finite(duration.actual)) return behavior;
          if (duration.actual < 0) return behavior;
          // if (duration.actual > 6 * 60 * 60) return;

          mimir.tokenize(behavior.name).forEach((token) => {
            let durations;
            if (dict.has(token)) {
              durations = dict.get(token);
            } else {
              durations = [];
              dict.set(token, durations);
            }

            durations.push(duration.actual);
          });

          return behavior;
        })
        .tap((behaviors) => {
          dict.forEach((durations, token) => {
            dict.set(token, ss.average(durations));
          });

          // TODO update tokenizator to consider emojis
          dict.delete("");

          // TODO update tokenizator to consider R$
          dict.delete("r");

          this.durationByToken = dict;
        })
        .value();

      return Promise.resolve(behaviors);
    },
    predict(behaviors) {
      let total = behaviors.length;
      behaviors.forEach((behavior, index) => {
        if (!behavior.name) return;
        let durations = _.compact(mimir.tokenize(behavior.name).map((token) => this.durationByToken.get(token)));
        if (!durations.length) durations = [0];
        if (!(index % 1000)) console.log('predicting duration', index, 'of', total, 'Sample:', behavior.name, 'Predicted Duration:', ss.average(durations));
        behavior.features.duration.estimated = ss.average(durations);
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
            .filter('name')
            .map((behavior, index) => {
              let value = {}, input, output;
              if (!(index % 1000)) console.log('predicting duration', index, 'of', behaviors.length, 'Sample:', behavior.name);

              if (behavior.features.duration.actual < 0) return;
              // if (behavior.features.duration.actual > 6 * 60 * 60) return;

              let durations = _.compact(mimir.tokenize(behavior.name).map((token) => this.durationByToken.get(token)));
              if (!durations.length) durations = [0];
              value.predicted = ss.average(durations) / 60;

              if (!Number.isFinite(behavior.features.duration.actual)) return value;
              value.actual = behavior.features.duration.actual / 60;

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
}));

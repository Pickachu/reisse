'use strict'

var Classifiers = Classifiers || (Classifiers = {});

// It currently yields:
// - a 58% prediction success for hour
Classifiers.ResponsibilityArea = stampit({
    init () {
      let Architect   = synaptic.Architect;

      this.perceptron = new Architect.Perceptron(24, this.areas.length * 2, this.areas.length);
      this.areaIds = this.areas.map((area) => area.provider.id);
    },
    methods: {
        learn(behaviors) {
          if (this.learned) return;

          let groups,
            baseInput  = _.fill(Array(24), 0),
            baseOutput = _.fill(Array(this.areas.length), 0),
            ids = this.areaIds,
            set;

          // Create training set
          set = _(behaviors).map((behavior) => {
            let hour = behavior.completedAt.getHours(),
              index  = ids.indexOf(behavior.areaId),
              input  = baseInput.concat([]),
              output = baseOutput.concat([]);

            input[hour  ] = 1;
            output[index] = 1;
            return {
              input : input,
              output: output
            };
          }).value();

          // Train network
          this.perceptron.trainer.train(set, {iterations: 5000});

          this.learned = true;
        },
        predict(behaviors) {
          let baseInput = _.fill(Array(24), 0), ids = this.areaIds;

          return behaviors.map((behavior) => {
            let hour    = behavior.context.startTime.getHours(),
            input       = baseInput.concat([]), prediction;
            input[hour] = 1;
            prediction           = this.perceptron.activate(input);
            prediction.predicted = prediction.indexOf(ss.max(prediction));
            prediction.actual    = ids.indexOf(behavior.areaId);
            return prediction;
          });
        },
        performance(behaviors) {
          let baseInput = _.fill(Array(24), 0), hour = (new Date()).getHours(), ids = this.areaIds, predictions = [];
          behaviors = behaviors || Re.learnableSet(app.ocurrences);

          behaviors.forEach((behavior) => {
            let hour    = behavior.completedAt.getHours(),
            input       = baseInput.concat([]), predicted, actual, prediction
            input[hour] = 1;
            prediction  = this.perceptron.activate(input);
            predicted   = prediction.indexOf(ss.max(prediction));
            actual      = ids.indexOf(behavior.areaId);
            predictions.push([actual, predicted, actual == predicted]);
          });

          return predictions;
        },
        quality (predictions) {
          let grouped = _.groupBy(predictions, (p) => p[2])
          return {
            success: grouped.true.length / predictions.length
          }
        }
    }
});

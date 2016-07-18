'use strict'

var Classifiers = Classifiers || (Classifiers = {});

// It currently yields:
// - a 58% prediction success for hour
Classifiers.ResponsibilityArea = stampit({
    init () {
      // FIXME forwardable properties to reisse classifiers
      this.areas || (this.areas = app.areas);
      this.stage();
    },
    methods: {
      stage() {
        let Architect   = synaptic.Architect;

        this.perceptron = new Architect.Perceptron(24, this.areas.length * 2, this.areas.length);
        this.areaIds = this.areas.map((area) => area.provider.id);
      },
      // TODO use task execution times to infer responsibility area
      learn(behaviors) {
        if (this.learned) return;

        let groups,
          baseInput  = _.fill(Array(24), 0),
          baseOutput = _.fill(Array(this.areas.length), 0),
          ids = this.areaIds,
          set;

        // Create training set
        set = _(behaviors).map((behavior) => {
          // Only learn responsibility area timing from completed behaviors
          if (!behavior.completedAt) return;

          if (!behavior.areaId) return console.warn('Anticipation: ResponsibilityArea:', behavior.__firebaseKey__, behavior.name, 'has no area defined! skiping');

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
        }).compact().value();

        // Train network
        this.perceptron.trainer.train(set, {iterations: 5000, log: 1000});

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
      performate(behaviors) {
        let baseInput = _.fill(Array(24), 0),
          hour = (new Date()).getHours(),
          hours = 24,
          ids  = this.areaIds, predictions = [],
          input, output, predicted, actual, prediction,
          columns = this.areas.map((area) => {return {key: area.name, values: []}});

        this.stage();
        this.learned = false;
        this.learn(Re.learnableSet(behaviors));

        while (hours--) {
          input       = baseInput.concat([])
          input[hours] = 1;

          output      = this.perceptron.activate(input);
          columns.forEach((column, index) => {
            column.values.unshift({
              x: hours,
              y: output[index]
            });
          });
        }

        // TODO also audit prediction error rate
        // output      = this.perceptron.activate(input);
        // predicted   = prediction.indexOf(ss.max(prediction));
        // actual      = ids.indexOf(behavior.areaId);
        // predictions.push([actual, predicted, actual == predicted]);

        return Promise.resolve({data: columns, stats: {sampleSize: behaviors.length}});
      },
      quality (predictions) {
        let grouped = _.groupBy(predictions, (p) => p[2])
        return {
          success: grouped.true.length / predictions.length
        }
      }
    }
});

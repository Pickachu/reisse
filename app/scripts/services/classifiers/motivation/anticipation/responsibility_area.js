'use strict'

// It currently yields:
// - a 58% prediction success for hour
Classifier.add(stampit({
  refs: {
    name: 'responsibilityArea'
  },
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

      let set, mapper = this._createMapper(behaviors);

      // Create training set
      set = _(behaviors)
        .map((behavior) => {
          return {
            input : mapper.input( behavior),
            output: mapper.output(behavior)
          };
        })
        .filter('input').filter('output')
        .value();

      if (mapper.skiped.length) {
        console.warn('classifier.responsibilityArea:', mapper.skiped.length, 'of', set.length,' ocurrences have no responsibility area defined and were skiped.')
      }

      // Train network
      let learning = this.perceptron.trainer.train(set, {iterations: 500, log: 100, rate: 0.01});

      this.learned = true;

      learning.set = set;
      learning.sampleSize = set.length;

      return learning;
    },
    predict(behaviors) {
      let baseInput = _.fill(Array(24), 0), ids = this.areaIds, contextualNow;

      contextualNow = (this.context && this.context.calendar.now);

      return behaviors.map((behavior) => {
        let hour    = (contextualNow || behavior.context.calendar.now).getHours(),
        input       = baseInput.concat([]), prediction;
        input[hour] = 1;
        prediction           = this.perceptron.activate(input);
        prediction.predicted = prediction.indexOf(ss.max(prediction));
        prediction.actual    = ids.indexOf(behavior.areaId);
        return prediction;
      });

    },
    _createMapper(behaviors) {
      let baseInput  = _.fill(Array(24), 0),
        baseOutput   = _.fill(Array(this.areas.length), 0);

      return {
        ids: this.areaIds,
        skiped: [],
        input (behavior) {
          // Only learn responsibility area timing from completed behaviors
          if (!behavior.completedAt) return this.skip(behavior);

          let hour = behavior.completedAt.getHours(),
            input  = baseInput.concat([]);

          input[hour  ] = 1;

          return input;
        },
        output (behavior) {
          if (!behavior.areaId) return this.skip(behavior);

          let index = this.ids.indexOf(behavior.areaId),
            output  = baseOutput.concat([]);

          output[index] = 1;

          return output;
        },
        duration (behavior) {
          let duration = behavior.features.duration;
          if (duration.truer) {
            if (behavior.start) {
              return {
                start   : moment(behavior.start),
                duration: duration.truer * 1000,
                end     : moment(behavior.start.getTime() + duration.truer * 1000)
              };
            }

            // TODO estimate start time of meals in duration
            if (behavior.completedAt) {
              return {
                start   : moment(behavior.completedAt.getTime() - duration.truer * 1000),
                duration: duration.truer * 1000,
                end     : moment(behavior.completedAt)
              };
            }
          }

          if (behavior.completedAt) {
            return {
              start   : moment(behavior.completedAt.getTime() - 60 * 1000),
              duration: 60 * 1000,
              end     : moment(behavior.completedAt)
            };
          }

          return this.skip(behavior);
        },
        skip(behavior) {
          this.skiped.push(behavior) && null;
        }
      };
    },
    performate(behaviors) {
      let baseInput = _.fill(Array(24), 0),
        hour, learning, hours = 24, fillers,
        ids, predictions = [], graphs = [],
        input, output, predicted, actual, prediction,
        columns = this.areas.map((area) => {return {key: area.name, values: []}}),
        learnable = this.performatableSet(behaviors);

      // run dependencies
      estimators.weight({areas: this.areas}).estimate(learnable);
      let p = estimators.duration({areas: this.areas}).estimate(learnable);
      return p.then(() => {
        this.stage();
        ids = this.areaIds;
        this.learned = false;
        let cap = moment().subtract(4, 'months').valueOf()

        learnable = _(learnable)
          .filter('completedAt')
          .filter((o) => o.completedAt > cap)
          .filter('areaId')
          .sortBy('completedAt')
          .value();

        let mapper = this._createMapper(learnable);

        // learning = this.learn(learnable);

        fillers = _(new Array(24)).map((m, index) => {return {x: index + 1, y: 0};}).value();
        columns = this.areas.map((area) => {return {key: area.name, values: fillers.concat([])}});

        _(learnable)
          .groupBy((o) => o.areaId + '/' + o.completedAt.getHours())
          .each((ocurrences, key) => {
            let splited = key.split('/'), areaId = splited[0],
              hour = +splited[1], index = ids.indexOf(areaId);

            columns[index].values[hour] = {
              x: hour,
              y: ocurrences.length
            };
          });

        graphs.push({data: columns, meta: {title: 'Behavior Completion by Daytime'}, type: 'multi-bar'});

        columns = this.areas.map((area) => {return {key: area.name, values: []}});

        _(learnable)
          .groupBy((o) => moment(o.completedAt).format('Y-M-ww'))
          .toPairs()
          .each((pair) => {
            let counts = _.groupBy(pair[1], 'areaId');

            ids.forEach((id, index) => {
              columns[index].values.push({
                x: pair[0],
                y: (counts[id] && counts[id].length) || 0
              });
            });
          });

        graphs.push({data: columns, meta: {title: 'Behavior Completion by Week'}, type: 'multi-bar'});

        columns = this.areas.map((area) => {return {key: area.name, values: []}});
        let offset  = 0;

        _(learnable)
          // .filter((o, index) => index % 100 == 0)

          .groupBy((o) => moment(o.completedAt).format('Y-M-DD'))
          .toPairs()
          .each((pair, position, pairs) => {
            let counts = _.groupBy(pair[1], 'areaId');

            ids.forEach((id, index) => {
              if (!counts[id]) return;

              counts[id].forEach((behavior) => {
                let event = mapper.duration(behavior);
                if (!event) return;
                let midnight = event.start.clone().startOf('day');

                columns[index].values.push({
                  open : 0,
                  close: 0,
                  high : moment.duration(event.end.diff(midnight)).as('hours'),
                  low  : moment.duration(event.start.diff(midnight)).as('hours'),
                  x    : position,
                  y    : moment.duration(event.end.diff(midnight)).as('hours')
                });
              });

            });
          });

        columns = columns.filter((column) => column.values.length);
        graphs.push({data: columns, meta: {title: 'Duration By Behavior'}, type: 'candle-stick-bar'});

        learning = this.learn(learnable);
        columns  = this.areas.map((area) => {return {key: area.name, values: fillers.concat([])}});

        while (hours--) {
          input        = baseInput.concat([]);
          input[hours] = 1;

          output      = this.perceptron.activate(input);
          columns.forEach((column, index) => {
            column.values.unshift({
              x: hours,
              y: output[index]
            });
          });
        }

        learning.title = "Classifier Output By Daytime";
        graphs.push({data: columns, meta: learning, type: 'multi-bar'});

        // ! TODO scatter audit completion time by daytime of ocurrence
        // ! TODO also audit prediction error rate
        // output      = this.perceptron.activate(input);
        // predicted   = prediction.indexOf(ss.max(prediction));
        // actual      = ids.indexOf(behavior.areaId);
        // predictions.push([actual, predicted, actual == predicted]);

        return Promise.resolve({graphs: graphs});
      });
    },
    quality (predictions) {
      let grouped = _.groupBy(predictions, (p) => p[2]);
      return {
        success: grouped.true.length / predictions.length
      };
    }
  }
}));

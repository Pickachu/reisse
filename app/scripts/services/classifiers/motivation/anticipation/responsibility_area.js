'use strict'

/**
 * Responsibility Area Classifier
 *
 * It should return a list of responsibility area probabilities for a given set of
 * behaviors
 */
Classifier.add(stampit({
  init () {
    // FIXME forwardable properties to reisse classifiers
    this.areas || (this.areas = app.areas);
    this.stage();
  },
  refs: {
    name: 'responsibility-area',

    stage() {
      let Architect   = synaptic.Architect;

      this.network = new Architect.Perceptron(24, this.areas.length * 2, this.areas.length);
      this.areaIds = this.areas.map((area) => area.provider.id);
    },

    learnableSet(behaviors) {

      return behaviors.filter((behavior) => {
        if (!behavior.areaId) {
          this.discard(behavior, 'no responsibility area defined (areaId)');
          return false;
        }

        if (!behavior.completedAt && !behavior.features.duration.truer) {
          this.discard(behavior, 'no duration or completion time defined (completedAt || feature.durations.truer)');
          return false;
        }

        return true;
      });
    },

    async learn(behaviors) {
      if (this.learned) return this.learned;

      const mapper = this._createMapper(behaviors);

      // Create training set
      const set = this
        .learnableSet(behaviors)
        .map((behavior) => {
          return {
            input : mapper.input( behavior),
            output: mapper.output(behavior)
          };
        });

      if (this.skips.length) {
        console.warn('[classifier.responsibility-area]', this.skips.length, 'of', set.length,' ocurrences have no responsibility area defined or inferrable duration and were skiped.');
      }

      return this._train(set, {iterations: 200, log: 50, rate: 0.01});
    },

    predictableBehavior(behavior, contextualNow) {
      const context = behavior;
      if (!(contextualNow || context.calendar && context.calendar.now)) {
        this.discard(behavior, 'no contextual now present on behavior and none provided to predictor (context.calendar.now)');
        return false;
      }

      if (!behavior.completedAt && !behavior.features.duration.truer) {
        this.discard(behavior, 'no duration or completion time defined');
        return false;
      }

      return true;
    },

    /**
     * Generates a probability distribution of responsibility areas
     * given a list of behaviors.
     *
     * Criteria in order:
     * - Uses a duration timeslice of completed behavior inferred from completed at
     * - Uses a duration timeslice of inferred from the given context calendar now
     */
    predict(behaviors, {context} = {}) {
      (this.context) || (this.context = context);

      const ids = this.areaIds,
      contextualNow = (this.context && this.context.calendar.now);

      return behaviors
        .map((behavior) => {
          let input;

          if (this.predictableBehavior(behavior, contextualNow)) {
            const hour    = (contextualNow || behavior.context.calendar.now).getHours();
            input = new Array(24).fill(0);
            input[hour] = 1;
          } else {
            input = new Array(24).fill(0.5);
          }

          const prediction = this.activate(input);

          return Object.assign(prediction, {
            predicted: prediction.indexOf(ss.max(prediction)),
            actual: behavior.areaId ? ids.indexOf(behavior.areaId) : null
          });
        });

    },
    _createMapper(behaviors) {
      const baseInput  = new Array(24).fill(0),
            baseOutput = new Array(this.areas.length).fill(0);

      return {
        ids: this.areaIds,
        skiped: [],
        defaultInput: new Array(24).fill(0.5),
        input (behavior) {
          let duration = this.duration(behavior),
          midnight = duration.start.clone().startOf('day'),
          start  = moment.duration(duration.start.diff(midnight)).as('hours'),
          cursor = Math.round(start),
          end    = moment.duration(duration.end.diff(midnight)).as('hours'),
          input  = baseInput.concat([]);

          if (end - start > 1) {
            input[Math.floor(start)] = (1 - start % 1) || 1;

            while (cursor < end) {
              input[cursor % 24] = 1;
              cursor += 1;
            }

            input[Math.floor(end) % 24] = (end % 1) || 1;
          } else {
            input[Math.floor(start)] = end - start;
          }

          return input;
        },
        output (behavior) {
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
                duration: duration.truer,
                end     : moment(behavior.start.getTime() + duration.truer)
              };
            }

            // TODO estimate start time of meals in duration
            if (behavior.completedAt) {
              return {
                start   : moment(behavior.completedAt.getTime() - duration.truer),
                duration: duration.truer,
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

          return false;
        }
      };
    },
    async performate(behaviors) {
      let baseInput = _.fill(Array(24), 0),
        hour, learning, hours = 24, fillers,
        ids, predictions = [], graphs = [],
        input, output, predicted, actual, prediction,
        columns = this.areas.map((area) => {return {key: area.name, values: []}}),
        learnable = this.performatableSet(behaviors);

      console.log('TODO consider responsibility area to limit amount of fun time');
      // run dependencies
      Estimator.get('weight', {areas: this.areas}).estimate(learnable);
      let p = Estimator.get('duration', {areas: this.areas}).estimate(learnable);
      return p.then(() => {
        this.stage();
        ids = this.areaIds;
        this.learned = false;

        // TODO do capping in another method
        let cap = moment().subtract(4, 'years').valueOf()

        learnable = _(learnable)
          .filter('completedAt')
          .filter((o) => o.completedAt > cap)
          .filter('areaId')
          .sortBy('completedAt')
          .value();

        if (!learnable.length) {
          console.warn(`[classifiers.responsibility-area] performance: learning set is empty!`);
        }

        let mapper = this._createMapper(learnable);

        // learning = this.learn(learnable);

        fillers = _(new Array(24)).map((m, index) => {return {x: index + 1, y: 0};}).value();
        columns = this.areas.map((area) => {return {key: area.name, values: _.cloneDeep(fillers)}});

        _(learnable)
          .groupBy((o) => o.areaId)
          .each((ocurrences, areaId) => {
            let index = ids.indexOf(areaId),
              inputs = ocurrences.map(mapper.input, mapper),
              column = columns[index];

            inputs.forEach((input) => {
              input.forEach((duration, daytime) => {
                column.values[daytime].y += duration;
              });
            });
          });

        graphs.push({data: columns, meta: {title: 'Behavior Presence by Daytime'}, type: 'multi-bar'});

        columns = this.areas.map((area) => {return {key: area.name, values: []}});

        _(learnable)
          .groupBy((o) => moment(o.completedAt).format('Y-M-ww'))
          .toPairs()
          .each((pair) => {
            let areas = _.groupBy(pair[1] /* ocurrences */, 'areaId');

            ids.forEach((areaId) => {
              let ocurrences = areas[areaId] || [],
              index = ids.indexOf(areaId),
              weight = ocurrences.reduce((aggregate, ocurrence) =>
                aggregate + mapper.duration(ocurrence).duration / (60 * 60 * 1000)
              , 0),
              column = columns[index];

              column.values.push({
                x: pair[0], // week number
                y: weight
              });
            });
          });

        graphs.push({data: columns, meta: {title: 'Behavior Completion by Week Index'}, type: 'multi-bar'});

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
        graphs.push({data: columns, meta: {title: 'Behavior Duration By Day'}, type: 'candle-stick-bar'});

        learning = this.learn(learnable);
        columns  = this.areas.map((area) => {return {key: area.name, values: fillers.concat([])}});

        while (hours--) {
          input        = baseInput.concat([]);
          input[hours] = 1;

          output      = this.network.activate(input);
          columns.forEach((column, index) => {
            column.values.unshift({
              x: hours,
              y: output[index]
            });
          });
        }

        learning.title = "Classifier Output By Daytime";
        graphs.push({data: columns, meta: learning, type: 'multi-bar'});

        // TODO scatter audit completion time by daytime of ocurrence
        // TODO also audit prediction error rate
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

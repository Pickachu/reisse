'use strict'

// ! FIXME this classifier is not used yet!
Classifier.add(stampit({
  refs: {
    name: 'dayTime'
  },
  init () {
    this.stage();
  },
  methods: {
    stage() {
      let Architect   = synaptic.Architect;

      // 24 hours
      // Predict activity type
      this.activityTypes = ['unknown', 'meal', 'sleep']
      this.perceptron    = new Architect.Perceptron(24, 4, this.activityTypes.length);
    },
    learn(behaviors) {
      if (this.learned) return;

      this.mapper = this._createMapper(behaviors);

      // Create training set
      let set = _(behaviors)
        .map((behavior) => {
          return {
            input : this.mapper.input( behavior),
            output: this.mapper.output(behavior)
          };
        })
        .filter('input').filter('output')
        .value();

      if (this.skips.length) {
        console.warn('classifier.dayTime:', this.skips.length, 'of', set.length,' ocurrences have no duration were skiped.');
      }

      // Train network
      let learning = this.perceptron.trainer.train(set, {iterations: 500, log: 100, rate: 0.01});

      this.learned = true;

      learning.set = set;
      learning.sampleSize = set.length;
      learning.mapper     = this.mapper;

      return Promise.resolve(learning);
    },

    // FIXME improve prediction api
    // FIXME consider contextual ranges in input time for activity
    predict(behaviors, options) {
      let baseInput = _.fill(Array(24), 0), types = this.activityTypes, contextualNow;

      contextualNow = (this.context && this.context.calendar.now);

      if (options.limit) {behaviors = [behaviors[behaviors.length - 1]]}

      return behaviors.map((behavior) => {
        let hour             = (contextualNow || behavior.context.calendar.now).getHours(),
        input                = baseInput.concat([]), prediction;
        input[hour]          = 1;
        prediction           = this.perceptron.activate(input);
        prediction.predicted = prediction.indexOf(ss.max(prediction));
        prediction.actual    = types.indexOf(behavior.activity && behavior.activity.type || 'unknown');
        return prediction;
      });

    },
    _createMapper(behaviors) {
      let baseInput  = _.fill(Array(24), 0),
        baseOutput   = _.fill(Array(this.activityTypes.length), 0);

      return {
        types: this.activityTypes,
        input (behavior) {
          let duration = this.duration(behavior);
          // Only learn responsibility area timing from completed behaviors
          if (!duration) return this.skip(behavior);

          let midnight = duration.start.clone().startOf('day'),
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
          let index = this.types.indexOf(behavior.activity && behavior.activity.type || 'unknown'),
            output  = baseOutput.concat([]);

          // Convert unknown activity types to unknown
          if (index < 0) {index = 0};

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
        skip: this.skip.bind(this)
      };
    },
    performate(behaviors) {
      let baseInput = _.fill(Array(24), 0),
        hour, learning, hours = 24, fillers,
        types, predictions = [], graphs = [],
        input, output, predicted, actual, prediction,
        columns   = this.activityTypes.map((type) => {return {key: type, values: []}}),
        learnable = this.performatableSet(behaviors);

      // run dependencies
      let p    = estimators.duration({activityTypes: this.activityTypes}).estimate(learnable);
      learning = this.learn(learnable);

      return p
        .then(() => {
          this.stage();
          let mapper = this._createMapper(learnable);
          return this.learn(learnable);
        })
        .then((learning) => {

          types = this.activityTypes;
          this.learned = false;
          let cap = moment().subtract(4, 'months').valueOf()

          learnable = _(learnable)
            .filter('completedAt')
            .filter((o) => o.completedAt > cap)
            .sortBy('completedAt')
            .value();

          // learning = this.learn(learnable);

          fillers = _(new Array(24)).map((m, index) => {return {x: index + 1, y: 0};}).value();
          columns = this.activityTypes.map((type) => {return {key: type, values: _.cloneDeep(fillers)}});

          _(learnable)
            .groupBy((o) => o.activity ? o.activity.type : 'unknown' )
            .each((ocurrences, type) => {
              let index = types.indexOf(type),
                inputs = ocurrences.map(mapper.input, mapper),
                column = columns[index] || columns[0];

              inputs.forEach((input) => {
                input.forEach((duration, dayTime) => {
                  column.values[dayTime].y += duration;
                });
              });
            });

          graphs.push({data: columns, meta: {title: 'Activity Presence by Daytime'}, type: 'multi-bar'});

          columns = this.activityTypes.map((type) => {return {key: type, values: []}});

          _(learnable)
            .groupBy((o) => moment(o.completedAt).format('Y-M-ww'))
            .toPairs()
            .each((pair) => {
              let activityTypes = _.groupBy(pair[1] /* ocurrences */, (o) => o.activity ? o.activity.type : 'unknown' );

              types.forEach((type) => {
                let ocurrences = activityTypes[type] || [],
                index = types.indexOf(type),
                weight = ocurrences.reduce((aggregate, ocurrence) =>
                  aggregate + mapper.duration(ocurrence).duration / (60 * 60 * 1000)
                , 0),
                column = columns[index] || columns[0];

                column.values.push({
                  x: pair[0], // week number
                  y: weight
                });
              });
            });

          graphs.push({data: columns, meta: {title: 'Behavior Completion by Week'}, type: 'multi-bar'});

          columns = this.activityTypes.map((type) => {return {key: type, values: []}});
          let offset  = 0;

          _(learnable)
            // .filter((o, index) => index % 100 == 0)

            .groupBy((o) => moment(o.completedAt).format('Y-M-DD'))
            .toPairs()
            .each((pair, position, pairs) => {
              let counts = _.groupBy(pair[1], (o) => o.activity ? o.activity.type : 'unknown' );

              types.forEach((id, index) => {
                if (!counts[id]) return;

                counts[id].forEach((behavior) => {
                  let event = mapper.duration(behavior);
                  if (!event) return;
                  let midnight = event.start.clone().startOf('day');

                  (columns[index] || columns[0]).values.push({
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


          columns  = this.activityTypes.map((type) => {return {key: type, values: fillers.concat([])}; });

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
          // actual      = types.indexOf(behavior.areaId);
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

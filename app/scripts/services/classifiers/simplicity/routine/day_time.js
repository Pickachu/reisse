'use strict'

// = Day Time Classifier
// It receives a ocurrence and maps it to a daytime timeslice and a activity type
// It outputs the most probable activity type for that daytime timeslice
// A daytime timeslice is simply a 24 hours vector array with a duration (start,
// time and end) representation of the ocurrence
Classifier.add(stampit({
  refs: {
    // TODO rename to activityType classifier
    name: 'dayTime'
  },
  init () {
    this.stage();
  },

  props: {
    // deprecated: did not yell better results
    // 24 day hours + 1 for center of timeslice
    // INPUT_SIZE: 24 + 1,
    INPUT_SIZE: 24,
  },
  methods: {
    stage() {
      let Architect   = synaptic.Architect;

      // TODO get activity types externaly
      this.activityTypes = ['unknown', 'meal', 'sleep', 'browse']
      this.perceptron    = new Architect.Perceptron(this.INPUT_SIZE, 4, this.activityTypes.length);
      this.learned       = false;
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
      let learning = this.perceptron.trainer.train(set, {iterations: 500, log: 100, rate: 0.5});

      this.learned = true;

      learning.set = set;
      learning.sampleSize = set.length;
      learning.mapper     = this.mapper;

      return Promise.resolve(learning);
    },

    // FIXME improve prediction api
    // FIXME consider contextual ranges in input time for activity
    predict(behaviors, options) {
      let baseInput = _.fill(Array(this.INPUT_SIZE), 0), types = this.activityTypes, contextualNow;

      contextualNow = (this.context && this.context.calendar.now);

      if (!options) {options = {}};
      if (options.limit) {behaviors = [behaviors[behaviors.length - 1]]}

      return behaviors.map((behavior) => {
        let hour             = (contextualNow || behavior.context.calendar.now).getHours(),
        input                = baseInput.concat([]), prediction;
        input[hour]          = options.hourActivationValue || 1;
        prediction           = this.perceptron.activate(input);
        prediction.predicted = prediction.indexOf(ss.max(prediction));
        prediction.actual    = types.indexOf(behavior.activity && behavior.activity.type || 'unknown');
        return prediction;
      });

    },

    _createMapper(behaviors) {
      let baseInput  = _.fill(Array(this.INPUT_SIZE), 0),
        baseOutput   = _.fill(Array(this.activityTypes.length), 0);

      return {
        types: this.activityTypes,

        // - Converts an activity to a duration timeslice
        // An activity that starts 8:45 and ends 10:25 would produce a duration
        // timeslice like this: [0, 0, 0, 0, 0, 0, 0, 0.75, 1, 0.25, 0, 0, ... ]
        // and adds the center of timeslice at the end
        input (behavior) {
          let duration = this.duration(behavior);
          if (!duration) return this.skip(behavior);

          // timeslice
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

          // center of timeslice (did not yield better results)
          // input[25] = (((end - start) / 2) + start) / 24;

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

          // FIXME throw an error, instead of guessing default durations
          // the estimator should estimate default durations when possible
          // behavior without truer duration should be ignored on this classifier.
          // This code is only temporary while we can't estimate meal durations
          if (behavior.completedAt) {
            return {
              start   : moment(behavior.completedAt.getTime() - 5 * 60 * 1000),
              duration: 5 * 60 * 1000,
              end     : moment(behavior.completedAt)
            };
          }

          return this.skip(behavior);
        },
        skip: this.skip.bind(this)
      };
    },

    performate(behaviors) {
      let baseInput = _.fill(Array(this.INPUT_SIZE), 0),
        hour, hours = 24, fillers, mapper, meta,
        types, predictions = [], graphs = [],
        input, output, predicted, actual, prediction,
        columns   = this.activityTypes.map((type) => {return {key: type, values: []}}),
        learnable = this.performatableSet(behaviors);

      return Estimator.get('duration', {activityTypes: this.activityTypes})
        .estimate(learnable)
        .then(() => {
          this.stage();
          mapper = this._createMapper(learnable);
          return this.learn(learnable);
        })
        .then((learning) => {

          types = this.activityTypes;

          fillers = _(new Array(24)).map((m, index) => {return {x: index + 1, y: 0};}).value();
          columns = types.map((type) => {return {key: type, values: _.cloneDeep(fillers)}});

          _(learnable)
            .groupBy((o) => o.activity ? o.activity.type : 'unknown' )
            .each((ocurrences, type) => {
              let index = types.indexOf(type),
                inputs = ocurrences.map(mapper.input, mapper),
                column = columns[index] || columns[0];

              inputs.forEach((input) => {
                input.slice(0, 24).forEach((duration, dayTime) => {
                  column.values[dayTime].y += duration;
                });
              });
            });

          graphs.push({data: columns, meta: {title: 'Activity Presence by Daytime'}, type: 'multi-bar'});



          columns = types.map((type) => {return {key: type, values: []}});

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

          meta = {
            title: 'Behavior Completion by Week',
            options: {
              axis: {x: {axisLabel: 'Week Index'}, y: {axisLabel: 'Total Behaviour Execution Time'}},
              domains: {y: [0, 50]},
            }
          };
          graphs.push({data: columns, meta, type: 'multi-bar'});



          columns = types.map((type) => {return {key: type, values: []}});

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
                  const midnight = event.start.clone().startOf('day'),
                    x = position,
                    y = moment.duration(event.end.diff(midnight)).as('hours');

                  // // TODO slice long behaviors representations
                  // if (y > 24) {
                  //   let unhandled = `Do not showing event ${behavior.name}.`;
                  //   unhandled += `\nBecause of too big duration (${y} hours)`;
                  //   console.warn(unhandled);
                  //   return;
                  // }

                  (columns[index] || columns[0]).values.push({
                    open : 0,
                    close: 0,
                    high : moment.duration(event.end.diff(midnight)).as('hours'),
                    low  : moment.duration(event.start.diff(midnight)).as('hours'),
                    x    : x,
                    y    : y
                  });
                });

              });
            });

          columns = columns.filter((column) => column.values.length);
          meta = {
            title: 'Behavior Duration By Day',
            options: {
              axis: {x: {axisLabel: 'Day Number'}, y: {axisLabel: 'Hour of the day'}},
              domains: {y: [0, 24]},
            }
          };
          graphs.push({data: columns, meta, type: 'candle-stick-bar'});



          columns  = types.map((type) => {return {key: type, values: fillers.concat([])}; });

          while (hours--) {
            let start = hours - 1;
            start = start < 0 ? 23 : start;

            input        = baseInput.concat([]);
            input[start] = 0.5;
            input[hours] = 1;
            input[(hours + 1) % 24] = 0.5;

            // timeslice center
            // input[24] = ((hours + 1 - start) / 2 + start) / 24

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

          // TODO scatter audit completion time by daytime of ocurrence
          // TODO also audit prediction error rate
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

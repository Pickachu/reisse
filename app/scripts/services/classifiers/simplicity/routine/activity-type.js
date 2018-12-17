'use strict'

/**
 * Activity Type Classifier
 *
 * Learns: Given a occurrence list, converts it into daytime timeslices and
 * train based on the timeslice with to classify activity type's based on timeslices.
 *
 * A daytime timeslice is simply a 24 hours vector array with a duration (start,
 * time and end) representation of the occurrence.
 *
 *
 * TODO learn to predict occurrences based on species instead of
 * only activity type
 * TODO rename to activitySpecies? or pehaps create another classifier
 * @type {Stamp}
 */
Classifier.add(stampit({
  init () {
    this.stage();
  },

  props: {
    // deprecated: did not yell better results
    // 24 day hours + 1 for center of timeslice
    // HOURS_IN_DAY: 24 + 1,
    HOURS_IN_DAY: 24,

    training: {iterations: 500, log: 100, rate: 0.1, shuffle: true}
  },
  refs: {
    name: 'activityType',
    stage({training, relearn = true} = {}) {
      const {Architect}   = synaptic;

      // TODO use activity species instead of activity types
      this.activityTypes = ['unknown', 'meal', 'sleep', 'browse', 'watch'];
      this.network = new Architect.Perceptron(this.HOURS_IN_DAY, 4, this.activityTypes.length);
      this.training = Object.assign(this.training, training);
      this.learned = null;
    },

    learn(occurrences) {
      if (this.learned) {
        console.log(`[classifier:${this.name}] skipping learning, already learned.`);
        return this.learned;
      };

      this.mapper = this._createMapper(occurrences);

      // Create training set
      let set = _(occurrences)
        .map((occurrence) => {
          return {
            input : this.mapper.input( occurrence),
            output: this.mapper.output(occurrence)
          };
        })
        .filter('input').filter('output')
        .value();

      if (this.skips.length) {
        console.warn(`[classifier:${this.name}]`, this.skips.length, 'of', set.length,' occurrences have no duration were skiped.');
      }

      // Train network
      return this._train(set, this.training);
    },

    // FIXME improve prediction api (by accepting context in the options object)
    // FIXME consider contextual ranges in input time for activity
    predict(occurrences, options) {
      let baseInput = new Array(this.HOURS_IN_DAY).fill(0), types = this.activityTypes, contextualNow;

      contextualNow = (this.context && this.context.calendar.now);

      if (!options) {options = {}};
      if (options.limit) {occurrences = [occurrences[occurrences.length - 1]]}

      return occurrences.map((occurrence) => {
        const hour = (contextualNow || context.calendar.now).getHours();
        const {context, activity: {type = 'unknown'}} = occurrence;
        let input       = baseInput.concat([]);

        input[hour] = options.hourActivationValue || 1;

        const prediction  = this.activate(input);

        return Object.assign(prediction, {
          occurrence,
          predicted: prediction.indexOf(ss.max(prediction)),
          actual   : types.indexOf(type),
        });

      });

    },

    _createMapper(occurrences) {
      let baseInput  = _.fill(Array(this.HOURS_IN_DAY), 0),
        baseOutput   = _.fill(Array(this.activityTypes.length), 0);

      return {
        types: this.activityTypes,

        // - Converts an activity to a duration timeslice
        // An activity that starts 8:45 and ends 10:25 would produce a duration
        // timeslice like this: [0, 0, 0, 0, 0, 0, 0, 0.75, 1, 0.25, 0, 0, ... ]
        // and adds the center of timeslice at the end
        input (occurrence) {
          let duration = this.duration(occurrence);
          if (!duration) return this.skip(occurrence, 'no duration or completion time defined');
          return this.createTimeslice(duration);
        },

        output (occurrence) {
          let index = this.types.indexOf(occurrence.activity && occurrence.activity.type || 'unknown'),
            output  = baseOutput.concat([]);

          // Convert unknown activity types to unknown
          if (index < 0) {index = 0};

          output[index] = 1;

          return output;
        },
        duration (occurrence) {
          let duration = occurrence.features.duration;
          if (duration.truer) {
            if (occurrence.start) {
              return {
                start   : moment(occurrence.start),
                duration: duration.truer,
                end     : moment(occurrence.start.getTime() + duration.truer)
              };
            }

            // TODO estimate start time of meals in duration
            if (occurrence.completedAt) {
              return {
                start   : moment(occurrence.completedAt.getTime() - duration.truer),
                duration: duration.truer,
                end     : moment(occurrence.completedAt)
              };
            }
          }

          // FIXME throw an error, instead of guessing default durations
          // the estimator should estimate default durations when possible
          // occurrence without truer duration should be ignored on this classifier.
          // This code is only temporary while we can't estimate meal durations
          if (occurrence.completedAt) {
            return {
              start   : moment(occurrence.completedAt.getTime() - 5 * 60 * 1000),
              duration: 5 * 60 * 1000,
              end     : moment(occurrence.completedAt)
            };
          }

          return this.skip(occurrence);
        },

        createTimeslice(duration) {
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
        skip: this.skip.bind(this),
      };
    },

    async createProbabilityMap(occurrences, context) {
      if (!this.learned) {
        throw new Error(`[classifier:${this.name}] learning is required before creating creating probability map.`);
      }

      this.context = context;
      const [prediction] = await this.predict(occurrences, {context, limit: 1});

      return this.activityTypes.reduce((map, type, index) => {
        map.set(type, prediction[index]);
        return map;
      }, new Map());
    },


    async performate(occurrences, options = {}) {
      let baseInput = new Array(this.HOURS_IN_DAY).fill(0), meta,
        predictions = [], graphs = [], predicted, actual, prediction;

      this.stage(options.stage);
      const performatable = this.performatableSet(occurrences);
      await Estimator.get('duration', {activityTypes: this.activityTypes}).estimate(performatable);
      const learning = await this.learn(performatable);
      const {mapper} = learning;
      const types = this.activityTypes;
      const fillers = _(new Array(24)).map((m, index) => {return {x: index + 1, y: 0};}).value();

      let columns = types.map((type) => {return {key: type, values: _.cloneDeep(fillers)}});

      _(performatable)
        .groupBy(({activity = {}}) => activity.type || 'unknown')
        .each((occurrences, type) => {
          let index = types.indexOf(type),
            inputs = occurrences.map(mapper.input, mapper),
            column = columns[index] || columns[0];

          inputs.filter((i) => i).forEach((input) => {
            input.slice(0, 24).forEach((duration, dayTime) => {
              column.values[dayTime].y += duration;
            });
          });
        });

      meta = Object.assign({}, learning, {
        title: 'Activity Presence by Daytime',
        options({xAxis, yAxis, tooltip, yDomain}, chart) {
          yAxis.axisLabel('Cumulative activity duration');
          yAxis.tickFormat((hour) => hour + ' h');
          xAxis.axisLabel('Hour of the day');
          xAxis.tickFormat((hour) => hour + ':00');
        }
      });
      graphs.push({data: columns, meta, type: 'multi-bar'});


      columns = types.map((type) => {return {key: type, values: []}});

      _(performatable)
        .groupBy(({completedAt}) => moment(completedAt).format('Y-M-ww'))
        .toPairs()
        .each((pair) => {
          let activityTypes = _.groupBy(pair[1] /* occurrences */, (o) => o.activity ? o.activity.type : 'unknown' );

          types.forEach((type) => {
            let occurrences = activityTypes[type] || [],
            index = types.indexOf(type),
            weight = occurrences
              .filter((o) => mapper.duration(o))
              .reduce((aggregate, ocurrence) =>
                aggregate + mapper.duration(ocurrence).duration / (60 * 60 * 1000)
              , 0),
            column = columns[index] || columns[0];

            column.values.push({
              x: pair[0], // week number
              y: weight
            });
          });
        });

      meta = Object.assign({}, learning, {
        title: 'Activity Completion by Week',
        options: {
          axis: {x: {axisLabel: 'Week Index'}, y: {axisLabel: 'Cumulative activity execution time'}},
          domains: {y: [0, 50]},
        }
      });
      graphs.push({data: columns, meta, type: 'multi-bar'});


      columns = types.map((type) => {return {key: type, values: []}});

      _(performatable)
        // .filter((o, index) => index % 100 == 0)

        .groupBy(({completedAt}) => moment(completedAt).format('Y-M-DD'))
        .toPairs()
        .each(([grouping, occurrences], position) => {
          let counts = _.groupBy(occurrences, ({activity = {}}) => activity.type || 'unknown');

          types.forEach((type, index) => {
            if (!counts[type]) return;

            counts[type].forEach((occurrence) => {
              let event = mapper.duration(occurrence);
              if (!event) return;
              const midnight = event.start.clone().startOf('day'),
                x = position,
                y = moment.duration(event.end.diff(midnight)).as('hours');

              // // TODO slice long occurrences representations
              // if (y > 24) {
              //   let unhandled = `Do not showing event ${occurrence.name}.`;
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
      meta = Object.assign({}, learning, {
        title: 'Activity Duration By Day',
        options({xAxis, yAxis, tooltip, yDomain}, chart) {
          chart.height = 1000;
          xAxis.axisLabel('Day Number');
          xAxis.tickFormat((index) => 'Activity ' + index);
          yAxis.axisLabel('Hour of the day');
          yAxis.tickFormat((hour) => hour + ':00');
          yDomain([0, 24]);
        }
      });
      graphs.push({data: columns, meta, type: 'candle-stick-bar'});



      columns = types.map((type) => {return {key: type, values: fillers.concat([])}; });

      _(performatable)
        // .filter((o, index) => index % 100 == 0)

        .groupBy(({completedAt}) => moment(completedAt).format('Y-M-DD'))
        .toPairs()
        .each(([grouping, occurrences], position) => {
          let counts = _.groupBy(occurrences, ({activity = {}}) => activity.type || 'unknown');

          types.forEach((type, index) => {
            if (!counts[type]) return;

            counts[type].forEach((occurrence) => {
              let event = mapper.duration(occurrence);
              if (!event) return;
              const midnight = event.start.clone().startOf('day'),
                x = position,
                y = moment.duration(event.end.diff(midnight)).as('hours');

              // // TODO slice long occurrences representations
              // if (y > 24) {
              //   let unhandled = `Do not showing event ${occurrence.name}.`;
              //   unhandled += `\nBecause of too big duration (${y} hours)`;
              //   console.warn(unhandled);
              //   return;
              // }

              (columns[index] || columns[0]).values.push({
                occurrence,
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

      columns = [0.2, 0.5, 1, 2, 3, 6, 8].reduce((columns, size) => {
        const inputs = this._createTimeBlocks(moment.duration(size, 'hours'));
        const midnight = moment().startOf('day');
        const position = columns.reduce((accumulator, {values}) => accumulator + values.length, 0)

        columns[0].values = columns[0].values.concat(inputs.reduce((values, input) => {
          const low = input.findIndex((a) => a > 0);
          const high = _.findLastIndex(input, (a) => a > 0) + size;
          return values.concat({
            x : position + values.length, high, low,
            y : (high - low) / 2, input,
            open: 0, close: 0,
            output: this.activate(input),
          });
        }, []));

        return columns;
      }, [{values: [], key: 'Input'}])

      meta = Object.assign({}, learning, {
        title: 'Classifier Output By Daytime',
        options({xAxis, yAxis, tooltip, yDomain, interactiveLayer}, chart) {
          chart.height = 1000;
          xAxis.axisLabel('Time block size');
          yAxis.axisLabel('Hour of the day');
          yDomain([0, 24]);
          interactiveLayer.tooltip.contentGenerator(({series: [{data: {input, output, low, high}}]}) => {
            let content = `<h4>Range: ${low}-${high}h (${high - low} hours)</h4>`,
            predicted = output.indexOf(ss.max(output));
            content += `<p style="text-align: left;">Predicted: ${types[predicted]}<p>`
            content += `<p style="text-align: left;">Input: ${input}<p>`
            content = output.reduce((html, activation, index) =>
              html + `<p style="text-align: left;">${_.startCase(types[index])}: ${activation.toFixed(4)}<p>`
            , content)
            return content;
          });
        }
      });
      graphs.push({data: columns, meta, type: 'candle-stick-bar'});

      // TODO scatter audit completion time by daytime of ocurrence
      // TODO also audit prediction error rate
      // output      = this.network.activate(input);
      // predicted   = prediction.indexOf(ss.max(prediction));
      // actual      = types.indexOf(occurrence.areaId);
      // predictions.push([actual, predicted, actual == predicted]);

      return {graphs}
    },

    /**
     * Given an time range slice it into time blocks and convert this time blocks
     * to network compatible input timeslices.
     *
     * @param  {moment.duration} timeblock size of time block
     * @param  {moment} [range.start]
     * @param  {moment} [range.end]
     *
     * @return {Array[]}           array of timeslics ready to input
     */
    _createTimeBlocks(timeblock, {start = moment().startOf('day'), end = moment().endOf('day')} = {}) {
      if (!this.learned) {
        throw new Error(`[classifier:${this.name}] learning is required before creating creating time blocks.`);
      }
      const cursor = start.clone(), inputs = [];

      while (cursor.isBefore(end)) {
        inputs.push(this.mapper.createTimeslice({
          start: cursor,
          end: cursor.clone().add(timeblock),
        }));

        cursor.add(timeblock);
      }

      return inputs;
    },

    quality (predictions) {
      let grouped = _.groupBy(predictions, (p) => p[2]);
      return {
        success: grouped.true.length / predictions.length
      };
    },
  }
}));

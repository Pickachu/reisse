'use strict'

// = Day Time / Meal Classifier
Classifier.add(stampit({
  refs: {
    // TODO rename to activityTypeDaytime classifier and use it to classify
    // daytime of activities by type
    name: 'dayTime/meal',
    SAMPLE_SIZE: 9
  },
  init () {
    this.stage();
  },
  methods: {
    stage() {
      let Architect   = synaptic.Architect;
      this.SAMPLE_SIZE = 12;

      // TODO extract dynamically activity types from dataset
      // this.network       = new Architect.LSTM(this.SAMPLE_SIZE, 6, 5, 5, 1);
      this.network       = new Architect.LSTM(this.SAMPLE_SIZE, 6, 5, 1);
      this.learned       = false;
    },

    learn(behaviors) {
      if (this.learned) return;

      this.mapper = this._createMapper(behaviors);

      // Create training set
      // ! Check generate the best day meal prediction
      let set = _(this.learnableSet(behaviors, {sorted: 1, size: 0.3}))
        .filter((b) => b.activity && b.activity.type === 'meal' )
        .map((behavior, index, behaviors) => {
          if (index - this.SAMPLE_SIZE <= 0) return null;

          let extractable = behaviors.slice(index - this.SAMPLE_SIZE, index);

          return {
            input : this.mapper.input(extractable),
            output: this.mapper.output(behavior)
          };
        })
        .filter('input').filter('output')
        .value();

      if (this.skips.length) {
        console.warn('classifier.dayTime/meal:', this.skips.length, 'of', set.length,' ocurrences are not of type meal and were skipped.');
      }

      // Train network
      this.learned = true
      return this._train(set, {iterations: 30, log: 5, rate: 0.7});
    },

    // Receives an array of behaviors
    // predict the next meal hour time given the whole set of previous behaviors
    predict(behaviors, options) {
      if (!options) {options = {}};
      if (options.limit) {behaviors = [behaviors[behaviors.length - 1]]}

      return _(behaviors)
        .filter((b) => b.activity && b.activity.type === 'meal' )
        .map((behavior, index, behaviors) => {
          if (index - this.SAMPLE_SIZE < 0) return null;

          let extractable = behaviors.slice(index - (this.SAMPLE_SIZE - 1), index + 1);

          return this.mapper.input(extractable);
        })
        .map((input) =>
          this.mapper.denormalize(this.network.activate(input))
        )
        .value();
    },

    predictTrend(behaviors, options) {
      let limitReached = options.limitReached, trend = [];

      const input = _(behaviors)
        .filter((b) => b.activity && b.activity.type === 'meal' )
        .sortBy('createdAt')
        // for the first input we only need the last eight behaviors
        .slice(- this.SAMPLE_SIZE)
        // TODO threat cases where there is not eight meal records!
        .thru(this.mapper.input.bind(this.mapper))
        .value()

      if (input.length < (this.SAMPLE_SIZE)) {
        throw new TypeError('At least ' + this.SAMPLE_SIZE + ' meals are necessary!');
      }

      let next = () => {
        const last = this.network.activate(input);
        input.push(last[0]);
        input.shift();
        return last;
      }

      let last = next();
      while (!limitReached.call(this, last)) {
        trend.push(last);
        last = next();
      }

      return trend;
      // let baseInput = _.fill(Array(24), 0), types = this.activityTypes, contextualNow;
      //
      // contextualNow = (this.context && this.context.calendar.now);
      //
      //
      // return behaviors.map((behavior) => {
      //   let hour             = (contextualNow || behavior.context.calendar.now).getHours(),
      //   input                = baseInput.concat([]), prediction;
      //   input[hour]          = options.hourActivationValue || 1;
      //   prediction           = this.perceptron.activate(input);
      //   prediction.predicted = prediction.indexOf(ss.max(prediction));
      //   prediction.actual    = types.indexOf(behavior.activity && behavior.activity.type || 'unknown');
      //   return prediction;
      // });

    },

    _createMapper(behaviors) {

      return {
        // - Converts an activity to a central activation hor
        input (extractable) {
          return extractable.map(this.hoursActivation, this);
        },

        output (behavior) {
          return [this.hoursActivation(behavior)];
        },
        // TODO highier precision date estimation of exact middle time of meal
        hoursActivation (behavior) {
          return this.hoursActivationForDate(behavior.start || behavior.completedAt);
        },
        hoursActivationForDate (date) {
          // return moment(date).diff(moment(date).startOf('day')) / 86400000;
          return moment(date).hours() / 24;
        },
        denormalize (output) {
          // return output[0] * 86400000;
          return output[0] * 24;
        },
        skip: this.skip.bind(this)
      };
    },

    performate(behaviors) {
      let baseInput = _.fill(Array(24), 0),
        fillers, mapper,
        types, predictions = [], graphs = [], columns = {},
        input, output, predicted, actual, prediction,
        learnable = this.performatableSet(behaviors);

      return Promise.resolve().then(() => {
          this.stage();
          return this.learn(learnable);
        })
        .then((learning) => {
          mapper = learning.mapper;

          // types = this.activityTypes;

          // fillers = _(new Array(24)).map((m, index) => {return {x: index + 1, y: 0};}).value();
          // columns = this.activityTypes.map((type) => {return {key: type, values: _.cloneDeep(fillers)}});
          //
          // _(learnable)
          //   .groupBy((o) => o.activity ? o.activity.type : 'unknown' )
          //   .each((ocurrences, type) => {
          //     let index = types.indexOf(type),
          //       inputs = ocurrences.map(mapper.input, mapper),
          //       column = columns[index] || columns[0];
          //
          //     inputs.forEach((input) => {
          //       input.forEach((duration, dayTime) => {
          //         column.values[dayTime].y += duration;
          //       });
          //     });
          //   });
          //
          // graphs.push({data: columns, meta: {title: 'Activity Presence by Daytime'}, type: 'multi-bar'});

          columns  = [{key: 'Predicted Meal Time', values: []}, {key: 'Actual Meal Time', values: []}];

          // Display only the last N values
          learning.set = learning.set
            .filter((example, index, examples) => index > examples.length - 50);

          // Create graph rows
          learning.set.forEach((example, index) => {
            let predicted = this.network.activate(example.input);
            columns[0].values.push({x: index, y: mapper.denormalize(predicted)});
            columns[1].values.push({x: index, y: mapper.denormalize(example.output)});
          });

          // future predictions
          // TODO improve LSTM future predictions
          var amount = 10;
          var last   = learning.set.slice(-1)[0].input;
          var index  = learning.set.length;
          while (amount--) {
            let predicted = this.network.activate(last);
            index += 1;

            columns[0].values.push({x: index, y: mapper.denormalize(predicted)});
            columns[1].values.push({x: index, y: 0});

            last.push(predicted[0]);
            last.shift();
          }

          learning.title = "Trained Dataset × Predicted Dataset + Future Dataset";
          graphs.push({data: columns, meta: learning, type: 'scatter'});

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

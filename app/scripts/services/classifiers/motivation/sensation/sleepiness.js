'use strict';

// Predicts current context sleepiness
// http://super-memory.com/articles/sleep.htm#Borb.C3.A9ly_model
// Sleepiness have two main components according to Borbély model
//  Circadian Component
//  TODO: Homeostatic Component
Classifier.add(stampit({
  init () { this.stage(); },
  refs: {
    name: 'sleepiness',
    stage () {
      let Architect   = synaptic.Architect;

      // this.perceptron   = new Architect.Perceptron(1, 3, 1);
      this.sleep = this.sleep || Classifier.sleep;

      let twoMothsAgo = Date.now() - 2 * 30 * 24 * 60 * 60 * 1000;
      // this.timeCap = new Date(twoMothsAgo);
      this.timeCap = new Date(0); // TODO be more explicit about missing sleep occurrences!
      this.learned = null
    },
    learn(behaviors) {
      let maximumDuration = 0, aDayInSeconds = 24 * 60 * 60, learning;

      this.model = {
        durationsByPhase: new Map,
        averagesByPhase: new Map,
        maximumAverage: - Infinity,
        incorporateDay (day) {
          // normalize phase to 30 minutes
          let phase   = Math.round(day.phase / (0.5 * 60 * 60)),
            durations = this.durationsByPhase.get(phase) || [];

          durations.push(day.duration);

          this.durationsByPhase.set(phase, durations);
        },
        // TODO train a line model over the averages
        train () {
          this.durationsByPhase.forEach((durations, phase) => {
            let average = ss.average(durations);
            this.averagesByPhase.set(phase, average);
            if (this.maximumAverage < average) this.maximumAverage = average;
          });
        },
        predict(phase) {
          let nearestAverage = this.averagesByPhase.get(phase) || 0,
            distance = Infinity;

          if (nearestAverage) return nearestAverage / this.maximumAverage;

          this.averagesByPhase.forEach((average, learnedPhase) => {
            if (distance > Math.abs(learnedPhase - phase)) {
              distance       = Math.abs(learnedPhase - phase);
              nearestAverage = average;
            }
          });

          if (distance > 4) {
            let message = `[classifier.sleepiness.predict] Poor phase model detected.`;
            message += `Nearest circadian phase have a distance of ${distance} from`;
            message += `the ${phase} provided. Increase sleep records on learning step.`;
            console.warn(message);
          }

          return nearestAverage / this.maximumAverage;
        }
      };

      const set = _(behaviors)
        // TODO also use naps
        .filter({activity: {type: 'sleep'}})
        .filter((behavior) => behavior.completedAt > this.timeCap)
        .sortBy('awakeAt')

        // Create all cicardian days
        .map((behavior, index, behaviors) => {
          let previous = behaviors[index - 1], awakeTime;
          if (!previous) return;

          maximumDuration = Math.max(maximumDuration, behavior.features.duration.actual);

          awakeTime = (behavior.asleepAt - previous.awakeAt) / 1000;

          // TODO better way to ignore missing or failed datapoints
          if (awakeTime > aDayInSeconds) return;

          // TODO better jawbone data normalization on import!
          if (awakeTime < 0) {
            let message = 'sleepiness: Overlapping sleep records found! Will skip!\n';
            message    += ` times: \n awake: ${previous.asleepAt} - ${previous.awakeAt}\n`;
            message    += ` awake: ${behavior.asleepAt} - ${behavior.awakeAt}`;
            console.warn(message);
            return;
          }

          // Return a cicardian day
          // TODO rename to cicardian day phase
          return {
            // Sleep cicardian phase time
            phase: awakeTime,

            // Asleep period duration
            duration: behavior.features.duration.actual
          };
        }).compact().map((day) => {
          this.model.incorporateDay(day);

          return {
            input : [ day.phase    / aDayInSeconds   ],
            output: [ day.duration / maximumDuration ]
          }
        }).value();

      this.model.train();

      if (set.length < 15) {
        console.warn(`classifier.sleepiness: Insuficient sleep ocurrences found '${set.length}', will not be able to predict sleepiness.`);
      }

      // Train network
      // learning = this.perceptron.trainer.train(set, {iterations: 1000, log: 100});
      return this.learned = Object.assign({set,
        // TODO move to _createMapper
        mapper: {maximumDuration, aDayInSeconds},
        sampleSize: set.length,
        discards: this.skips.concat([]),
      });
    },
    // TODO train model until given context day
    // TODO create sleepiness estimator for past ocurrences
    // TODO take into account RPC's phase shifitting effects on today's wake time in relation to previous waking times
    // TODO predict sleepiness for not opened occurrences, currently only returns sleepiness for context
    // TODO remove this.context, and use only parameter
    predict(behaviors, {context}) {
      let now = (context || this.context).calendar.now, sleep,
      phase, awakeTime, pastContext, predicted;

      // Discover cicardian day start time
      // - TODO Today's wake time
      // - Predicted today's wake time
      let previousDayContext = (context) => {// TODO move this to Context service
        let yesterday = _.cloneDeep(context);
        yesterday.calendar.now = moment(context.calendar.now).subtract(1, 'day').toDate();
        return yesterday;
      };

      this.sleep.context = previousDayContext(context || this.context);
      sleep = this.sleep.predict();

      while (sleep.awakeAt && sleep.awakeAt > now) {
        this.sleep.context = previousDayContext(this.sleep.context);
        sleep = this.sleep.predict();
      }

      // Discover current cicardian phase
      awakeTime = (now - sleep.awakeAt) / 1000;

      // - Model currently have 48 phases, one for each half hour of the cicardian day
      phase     = awakeTime / (0.5 * 60 * 60); // TODO externalize phase normalization to model

      // Predict sleepiness for phase
      predicted = this.model.predict(phase);

      return predicted;
    },
    performate(behaviors) {
      let hour = 24,
        inputs        = {key: 'Entrada'     , values: []},
        averages      = {key: 'Sonolência Cicardiana (Média)'       , values: []},
        data = [inputs, averages], graphs = [],
        learning, input, output, mapper;

      // Performance graph
      this.stage();
      learning = this.learn(this.performatableSet(behaviors));
      mapper   = learning.mapper;

      // [{
      //   key: previsoes,
      //   values: [{
      //     x: hora do dia cicardiano
      //     y: duração do sono
      //   }]
      // }]
      // TODO implement mapper
      // while (hour--) {
      //   input  = [hour * 60 * 60];
      //   output = this.perceptron.activate(input);
      //
      //   durations.values.unshift({
      //     x: hour,
      //     y: output[0] * mapper.maximumDuration / (60 * 60),
      //     size: 2
      //   });
      // }

      this.model.averagesByPhase.forEach((average, phase) => {
        averages.values.push({
          x: phase / 2,
          y: average / (60 * 60),
          size: 2
        });
      });

      inputs.values = _(learning.set).map((train) => {
        return  {
          x: train.input[0]  * mapper.aDayInSeconds   / (60 * 60),
          y: train.output[0] * mapper.maximumDuration / (60 * 60)
        };
      }).value();

      graphs.push({data: data, meta: learning, type: 'scatter'});

      let durations  = {key: 'Dormiu'  , values: []};
      data = [durations];
      moment.locale('pt-br');
      durations.values = _(behaviors)
        .filter({activity: {type: 'sleep'}})
        .sortBy('awakeAt')
        .map((behavior, i) => {
          let asleepAt = moment(behavior.asleepAt),
          awakeAt      = moment(behavior.awakeAt ),
          start        = (behavior.awakeAt - awakeAt.startOf('day').valueOf()) / (60 * 60 * 1000),
          distance     = (behavior.awakeAt - behavior.asleepAt) / (60 * 60 * 1000);

          if (distance > 40) {
            return console.warn(behavior.__firebaseKey__, behavior.asleepAt, behavior.awakeAt, `\nInvalid long duration ${distance} hours sleep found!`);
          };

          return {
            open : 0,
            close: 0,
            high : start,
            low  : start - distance,
            x    : i,
            y    : start
          };
        })
        .compact()
        .value();

      graphs.push({data: data, meta: learning, type: 'candle-stick-bar'});

      return Promise.resolve({graphs: graphs});
    },
    quality (predictions) {
      // let grouped = _.groupBy(predictions, (p) => p[2])
      // return {
      //   success: grouped.true.length / predictions.length
      // }
    }
  }
}));

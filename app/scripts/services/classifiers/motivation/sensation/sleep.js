'use strict'

// Predicts hour of sleep by day of week
// Input vector of length 7 representing day of week
// Output hour of sleep and hour of awakening
// TODO move to routine classifier
Classifier.add(stampit({
  init () { this.stage(); },
  refs: {
    name: 'sleep',
    stage () {
      let Architect   = synaptic.Architect;
      this.perceptron = new Architect.LSTM(7, 5, 5, 2);

      this.timeCap = moment().subtract(4, 'months').toDate();
      this.minimunCount = 100;
      this.learned = false;
    },
    // TODO implement learnableSet method
    learn(behaviors) {
      if (this.learned) return;
      this.learned = true;
      let baseInput = _.fill(Array(7), 0), set, learning;

      // Create training set
      set = _(behaviors)
        .filter({activity: {type: 'sleep'}})
        .filter((behavior) => behavior.completedAt > this.timeCap)

        .thru((list) => {
          if (list.length < this.minimunCount) {
            const sleeps  = _(behaviors)
              .filter({activity: {type: 'sleep'}})
              .sortBy(behaviors, 'createdAt').value();

            const missing = Math.max(this.minimunCount - list.length, 0);
            list = list.concat(sleeps.slice(0, missing))
          }
          return list;
        })

        // Ignore naps and segmented sleep
        // TODO figure out better way to use and ignore naps and segmented sleep
        .filter((behavior) => behavior.features.duration.actual > 16800 * 1000)

        .map((behavior) => {
          let day = behavior.asleepAt.getDay(),
            input  = baseInput.concat(),
            asleepAt, awakeAt;

          input[day  ] = 1;
          asleepAt     = (behavior.asleepAt.getHours() * 60 + behavior.asleepAt.getMinutes()) / (24 * 60);
          awakeAt      = (behavior.awakeAt.getHours()  * 60 + behavior.awakeAt.getMinutes() ) / (24 * 60);

          // Assumes user will sleep between noon and next noon
          asleepAt     = (asleepAt + 0.5) % 1;

          return {
            input : input,
            output: [asleepAt, awakeAt]
          };
        }).value();

      // Train network
      learning = this.perceptron.trainer.train(set, {iterations: 1000, log: 100, rate: 0.3});
      learning.set = set;
      learning.sampleSize = set.length;
      return learning;
    },
    // TODO remove usage of ICAL.Time and start using moment.duration
    predict(behaviors) {
      let now = this.context.calendar.now,
        midnight = ICAL.Time.fromJSDate(now),
        prediction, awakeAt, asleepAt,
        input = _.fill(Array(7), 0);

      input[now.getDay()] = 1;
      prediction = this.perceptron.activate(input);

      // Normalize predictions
      prediction = [((prediction[0] + 0.5) % 1), prediction[1]];

      // Convert prediction for daytime
      midnight.hour  = midnight.minute = midnight.second = 0;
      midnight.addDuration(ICAL.Duration.fromSeconds(prediction[0] * 24 * 60 * 60));
      asleepAt = midnight.toJSDate();

      midnight.hour  = midnight.minute = midnight.second = 0;
      midnight.addDuration(ICAL.Duration.fromSeconds(prediction[1] * 24 * 60 * 60 + 24 * 60 * 60));
      awakeAt = midnight.toJSDate();

      return {asleepAt: asleepAt, awakeAt: awakeAt};

    },
    performate(behaviors) {
      let baseInput   = _.fill(Array(7), 0), day = 7,
        sleeps        = {key: 'Dormirá as' , values: []},
        awakenings    = {key: 'Acordará as', values: []},
        inputs        = {key: 'Entrada'    , values: []},
        data = [sleeps, awakenings, inputs], graphs = [],
        learning, input, output;

      // Performance graph
      this.stage();
      learning = this.learn(this.performatableSet(behaviors));

      // [{
      //   key: previsoes,
      //   values: [{
      //     x: nome do dia
      //     y: hora prevista para dormir
      //   }]
      // }]
      // TODO implement mapper
      while (day--) {
        input      = baseInput.concat([]);
        input[day] = 1;
        output     = this.perceptron.activate(input);

        sleeps.values.unshift({
          x: day,
          y: ((output[0] + 0.5) % 1) * 24,
          size: 2
        });

        awakenings.values.unshift({
          x: day,
          y: output[1] * 24,
          size: 2
        });
      }

      inputs.values = _(learning.set).map((train) => {
        return [
          {
            x: train.input.indexOf(1),
            y: ((train.output[0] + 0.5) % 1) * 24
          },
          {
            x: train.input.indexOf(1),
            y: train.output[1] * 24
          }
        ]
      }).flatten().value();

      graphs.push({data: data, meta: learning, type: 'scatter'});

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

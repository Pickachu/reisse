'use strict'

var Classifiers = Classifiers || (Classifiers = {});

// Predicts hour of sleep by day of week
Classifiers.Sleep = stampit({
    init () {
      this.stage();
    },
    methods: {
      stage () {
        let Architect   = synaptic.Architect;
        this.perceptron = new Architect.Perceptron(7, 5, 5, 2);

        let twoMothsAgo = Date.now() - 4 * 30 * 24 * 60 * 60 * 1000;
        this.timeCap = new Date(twoMothsAgo);
      },
      learn(behaviors) {
        let baseInput = _.fill(Array(7), 0),
          set;

        // Create training set
        set = _(behaviors)
          .where({activity: {type: 'sleep'}})
          .map((behavior) => {
            let day = behavior.completedAt.getDay(),
              input  = baseInput.concat([]),
              asleepAt, awakeAt;

            input[day  ] = 1;
            asleepAt     = (behavior.asleepAt.getHours() * 60 + behavior.asleepAt.getMinutes()) / (24 * 60);
            awakeAt      = (behavior.awakeAt.getHours()  * 60 + behavior.awakeAt.getMinutes() ) / (24 * 60);

            // Assume user will sleep between noon and next noon
            asleepAt     = (asleepAt + 0.5) % 1;

            return {
              input : input,
              output: [asleepAt, awakeAt]
            };
          }).value();

        // Train network
        this.perceptron.trainer.train(set, {iterations: 5000});
      },
      predict(behaviors) {
        let now = this.context.calendar.now,
          midnight = ICAL.Time.now(),
          prediction, awakeAt, asleepAt,
          creation = Date.now(),
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
        let baseInput  = _.fill(Array(7), 0), day = 7,
          sleeps     = {key: 'Dormirá as' , values: []},
          awakenings = {key: 'Acordará as', values: []},
          data = [sleeps, awakenings],
          input, output;

        this.stage();
        this.learn(Re.learnableSet(behaviors));

        // [{
        //   key: previsoes,
        //   values: [{
        //     x: nome do dia
        //     y: hora prevista para dormir
        //   }]
        // }]
        while (day--) {
          input      = baseInput.concat([]);
          input[day] = 1;
          output     = this.perceptron.activate(input);


          sleeps.values.push({
            x: day,
            y: ((output[0] + 0.5) % 1) * 24
          });

          awakenings.values.push({
            x: day,
            y: output[1] * 24
          });
        }

        sleeps.values.reverse();
        awakenings.values.reverse();

        return {data: data};
      },
      quality (predictions) {
        // let grouped = _.groupBy(predictions, (p) => p[2])
        // return {
        //   success: grouped.true.length / predictions.length
        // }
      }
    }
});

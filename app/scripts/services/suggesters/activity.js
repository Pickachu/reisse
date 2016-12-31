'use strict';

Suggester.add(stampit({
  refs: {
    name: 'activity'
  },
  methods: {
    // TODO add when method to suggesters
    suggest (behaviors, context) {
      this.stage();

      // Suggest todays sleep activity
      this.sleep(behaviors, context);

      // Suggest todays eating activity
      // TODO consult meal habitualizations when implementing meal suggestions
      // this.meal(behaviors, context);
    },

    stage (behaviors) {
      this.sleep     = Classifier.get('sleep');
      this.hunger    = Classifier.get('hunger');
      this.dayTime   = Classifier.get('dayTime');
      this.frequency = Classifier.get('frequency');
    },

    // Suggest optimal sleep and nap times
    // For sleep time predict using:
    // 1. Past sleep activity (sleep classifier)
    // TODO align past sleep activity with homeostatic and cicardian timing
    // TODO move behavior creation to habitual behaviors / external service behaviors generation
    sleep (behaviors, context) {
      let prediction, now = context.calendar.now;

      this.sleep.learn(_.filter(Re.learnableSet(behaviors), 'completedAt'));
      this.sleep.context = context;

      prediction = this.sleep.predict();

      // Suggest todays nap activity
      this.nap(behaviors, context);

      behaviors.push(Activity({
        // TODO add this properties
        // areaId   : this.healthArea.provider.id,
        // TODO better way to generate a temporary id
        provider    : {id: (Math.random() * 10000).toFixed(), name: 'relisse'},
        // quality  : x,
        // TODO predict features
        // features : {},
        activity    : {type: 'sleep'},
        name        : 'Sleep',
        notes       : 'How about sleeping at this time today?',
        status      : 'open',
        suggestion  : true,
        asleepAt    : prediction.asleepAt,
        awakeAt     : prediction.awakeAt,
        start       : prediction.asleepAt,
        end         : prediction.awakeAt,
        createdAt   : now,
        updatedAt   : now,
        completedAt : prediction.asleepAt
      }));
    },

    // TODO predict nap duration
    // Try to predict optimal napping time:
    // TODO 1. 7 hours after cicardian phase 0
    // TODO 2. 7 hours after today waking time
    // 3. 7 hours after today predicted waking time
    nap (behaviors, context) {
      let prediction, start, end, now = new Date();
      // TODO update context to be yesterday
      this.sleep.context = context;
      prediction = this.sleep.predict();

      // TODO get todays waking time
      // _(behaviors)
      //   .filter({activity: {type: 'sleep'}})
      //   .filter((behavior) => behavior.completedAt > this.timeCap)


      start = ICAL.Time.fromJSDate(prediction.awakeAt);

      // Backward 1 day
      start.addDuration(ICAL.Duration.fromSeconds(-1 * 24 * 60 * 60));

      // Forward 7 hours
      // TODO forward to optimal cicardian phase timing
      start.addDuration(ICAL.Duration.fromSeconds(7 * 60 * 60));

      end   = start.clone();

      // TODO predict nap duration
      end.addDuration(ICAL.Duration.fromSeconds(30 * 60));

      behaviors.push(Activity({
        // TODO add this properties
        // areaId   : this.healthArea.provider.id,
        // TODO better way to generate a temporary id
        provider    : {id: (Math.random() * 10000).toFixed(), name: 'relisse'},
        // quality  : x,
        // TODO predict features
        // features : {},
        activity    : {type: 'nap'},
        name        : 'Nap',
        notes       : 'How about napping at this time today?',
        status      : 'open',
        suggestion  : true,
        asleepAt    : start.toJSDate(),
        awakeAt     : end.toJSDate(),
        start       : start.toJSDate(),
        end         : end.toJSDate(),
        createdAt   : now,
        updatedAt   : now,
        completedAt : prediction.asleepAt
      }));
    },

    // Try to predict optimal eating time:
    // 1. TODO Past meal activity (meal classifier that predicts based on meal frequency and huger)
    // 2. TODO When estimated hunger is below eat threshold
    // 3. Guess meal weekly frequency and hunger level to predict meal times
    // TODO suggest macronutrient content / food content
    // TODO consider context.hunger when suggesting meals
    // TODO consider context.location when suggesting meals
    // TODO consider meals that already happened on context
    meal (behaviors, context) {
      let now = new Date(), macronutrients;

      // TODO consider todays sleep
      // todaysSleep = _.findLast(behaviors, ['activity.type', 'sleep'])

      this.dayTime.context = this.frequency.context = context;

      // FIXME create suggestions by context instead of assuming an 1 day daytime period
      let predictActivityTypeByDaytime = (behaviors, context) => {
        let start = moment(context.calendar.now).startOf('day'), end = start.clone().add(1, 'day'),
          cursor = _.cloneDeep(context), predicts;

        while (start.isBefore(end)) {
          // TODO increase granularity of daytime activity prediction
          cursor.calendar.now = start.add(1, 'hour').valueOf();
          this.dayTime.context = cursor;
          predicts.push(this.dayTime.predict(behaviors, {limit: 1}));
        }

        return Promise.all(predicts).then((predictions) => {
          let mealActivityIndex = this.dayTime.mapper.types.indexOf('meal').toString();

          return _(predictions).map((prediction, index) => {
            return {
              hour: index,
              probability: prediction[0][mealActivityIndex]
            };
          })
          .sortBy('probability')
          .value();
        });
      };

      // TODO better guessing of meal macronutrients
      macronutrients = {
        carbohydrate: 0.4,
        protein: 0.25,
        fat: 0.25,
        fiber: 0.1
      };

      // TODO improve dayTime prediction api
      Promise.all([this.frequency.predict(behaviors), predictActivityTypeByDaytime(behaviors, context)])
        .then((frequencies, probabilities) => {
          // TODO usar uma distribuição melhor de refeições por semana do que dividir por 7
          let amount = Math.round(frequencies.meal / 7), satiety, meals = [];

          while (amount > 0) {
            amount -= 1;

            // TODO guess meal duration
            start = moment(context.calendar.now).startOf('hour').hour(probabilities.pop().hour);
            end   = start.clone().add(15, 'minutes');

            meal = Activity({
              // TODO add this properties
              // areaId     : this.healthArea.provider.id,
              // TODO better way to generate a temporary id
              provider      : {id: (Math.random() * 10000).toFixed(), name: 'relisse'},
              // quality    : x,
              // TODO predict features
              // features   : {},
              activity      : {type: 'meal'},
              name          : 'Eat',
              notes         : 'How about eating at this time today?',
              status        : 'open',
              macronutrients: macronutrients,
              suggestion    : true,
              start         : start.toDate(),
              end           : end.toDate(),
              createdAt     : now,
              updatedAt     : now
            });

            meals.push(meal);
            // TODO consider satiety
            // predictions = this.hunger.predict(meals);
            // satiety     = this.hunger.mapper.denormalize(predictions.pop());
            // start       = end.clone().add(satiety, 'seconds');
          }

          behaviors = behaviors.concat(meals);
          return behaviors;
        });
    }
  }
}));

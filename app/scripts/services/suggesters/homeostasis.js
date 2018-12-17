'use strict';

Suggester.add(stampit({
  refs: {
    name: 'homeostasis'
  },
  methods: {
    // TODO add when method to suggesters
    suggest (behaviors, context) {
      const suggestions = [];

      this.stage(behaviors);

      // Suggest todays sleep activity
      suggestions.push(this.sleep(behaviors, context));

      // Suggest todays eating activity
      // TODO consult meal habitualizations when implementing meal suggestions
      suggestions.push(this.meal(behaviors, context));

      return Promise.all(suggestions);
    },

    stage (behaviors) {
      this.classifiers = {
        sleep        : Classifier.get('sleep'),
        hunger       : Classifier.get('hunger'),
        activityType : Classifier.get('activityType'),
        // NOTE not used yet, eventually will be used as some criteria for suggestion
        // activityType   : Classifier.get('activityType/meal'),
        frequency    : Classifier.get('frequency')
      };

      // this.ensureClassifiers();
    },

    // Suggest optimal sleep and nap times
    // For sleep time predict using:
    // 1. Past sleep activity (sleep classifier)
    // TODO align past sleep activity with homeostatic and cicardian timing
    // TODO move behavior creation to habitual behaviors / external service behaviors generation
    sleep (behaviors, context) {
      let prediction, now = context.calendar.now, sleep = this.classifiers.sleep;

      sleep.learn(_.filter(Re.learnableSet(behaviors), 'completedAt'));
      sleep.context = context;

      prediction = sleep.predict();

      // Suggest todays nap activity
      this.nap(behaviors, context);

      // TODO make imutable
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
    // TODO move behavior creation to habitual behaviors / external service behaviors generation
    nap (behaviors, context) {
      let prediction, start, end, now = new Date(), sleep = this.classifiers.sleep;
      // TODO update context to be yesterday
      sleep.context = context;
      prediction = sleep.predict();

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

      // TODO make imutable
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

    // Try to predict optimal eating time by this criteria (in order):
    // 1. TODO Past meal activity (meal classifier that predicts based on meal frequency and huger)
    // 2. TODO When estimated hunger is below eat threshold
    // 3. Guess meal weekly frequency and past times of day eating to
    // TODO suggest macronutrient content / food content
    // TODO consider context.hunger when suggesting meals
    // TODO consider context.location when suggesting meals
    // TODO consider meals that already happened on context
    // TODO move behavior creation to habitual behaviors / external service behaviors generation
    meal (behaviors, context) {
      let now = new Date(), macronutrients;
      const {activityType, frequency} = this.classifiers;

      // TODO consider todays sleep
      // todaysSleep = _.findLast(behaviors, ['activity.type', 'sleep'])
      activityType.context = frequency.context = context;

      // FIXME create suggestions by context instead of assuming an 1 day of
      // daytime period. essentialy stop assuming the same context for the whole
      // day
      let predictActivityTypeByDaytime = (behaviors, context) => {
        let start = moment(context.calendar.now).startOf('day'), end = start.clone().add(1, 'day'),
          cursor = _.cloneDeep(context), predicts = [];

        while (start.isBefore(end)) {
          // TODO increase granularity of daytime activity prediction
          // manually change context here
          cursor.calendar.now = start.add(1, 'hour').toDate();
          activityType.context = cursor;
          predicts.push(activityType.predict(behaviors, {limit: 1}));
        }

        return Promise.all(predicts).then((predictions) => {
          let mealActivityIndex = activityType.mapper.types.indexOf('meal').toString();

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

      // TODO improve activityType prediction api
      return Promise.resolve(activityType.learn(behaviors))
        .then(() => Promise.all([frequency.predict(behaviors), predictActivityTypeByDaytime(behaviors, context)]))
        .then(([frequencies, probabilities]) => [
          // TODO improve frequency prediction api (probably classifier api), by
          // allowing filtering (last week and meal only specie) results? For now
          // take last frequency and specie prediction by hand
          _(frequencies).filter(['specie', 'meal']).sortBy('week').value().pop().frequency,

          // Since we are suggesting, only suggest eating for future times
          // TODO remove this heuristic and improve the probability predictor
          // to consider habitual behaviors
          // TODO this filter currently is useless because context is always at
          // midnight
          probabilities.filter((p) => p.hour > moment(context.calendar.now).hour())
        ])
        .then(([frequency, probabilities]) => {
          // TODO usar uma distribuição melhor de refeições por semana do que dividir por 7
          let amount = Math.round(frequency / 7), satiety, meals = [], start, end, meal;

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

          // TODO make imutable
          behaviors.push.apply(behaviors, meals);
          return behaviors;
        });
    }
  }
}));

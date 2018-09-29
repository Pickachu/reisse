'use strict';

Suggester.add(stampit({
  refs: {
    name: 'content-absorpion'
  },
  methods: {
    // TODO add when method to suggesters
    suggest (behaviors, context) {
      const suggestions = [];

      // this.stage(behaviors);

      // Suggest todays content absorpion activity
      // suggestions.push(this.absorpion(behaviors, context));

      return Promise.all(suggestions);
    },

    stage (behaviors) {
      this.classifiers = {
        dayTime   : Classifier.get('dayTime'),
        frequency : Classifier.get('frequency')
      };

      // this.ensureClassifiers();
    },

    // Suggest optimal content absorpion times using:
    // 1. Past web browsing activity (dayTime activity classifier)
    absorpion (behaviors, context) {
      let now = new Date();

      // TODO improve dayTime prediction api
      return Promise.resolve(dayTime.learn(behaviors))
        .then(() => Promise.all([
          this.createActivityFrequencyMap('browse', behaviors, context),
          this.createActivityProbabilityMap('browse', behaviors, context)
        ]))
        .then(([frequencies, probabilities]) => [
          frequencies,
          // Since we are suggesting, only suggest eating for future times
          // TODO remove this heuristic and improve the probability predictor
          // to consider habitual behaviors
          // TODO this filter currently is useless because context is always at
          // midnight
          probabilities.filter((p) => p.hour > moment(context.calendar.now).hour())
        ])
        .then(([frequency, probabilities]) => {
          // TODO usar uma distribuição melhor de navegações por semana do que dividir por 7
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
    },

    // FIXME create suggestions by context instead of assuming an 1 day of
    // daytime period. essentialy stop assuming the same context for the whole
    // day
    // TODO perhaps move this to the daytime classifier?
    createActivityProbabilityMap(type = 'browse', behaviors, context) {
      const {dayTime} = this.classifiers;
      const start = moment(context.calendar.now).startOf('day'), end = start.clone().add(1, 'day'),
        cursor = _.cloneDeep(context), predicts = [];

      while (start.isBefore(end)) {
        // TODO increase granularity of daytime activity prediction
        // manually change context here
        cursor.calendar.now = start.add(1, 'hour').toDate();
        dayTime.context = cursor;
        predicts.push(dayTime.predict(behaviors, {limit: 1}));
      }

      return Promise.all(predicts).then((predictions) => {
        let activityIndex = dayTime.mapper.types.indexOf(type).toString();

        return _(predictions)
          .map((prediction, hour) => {
            return { hour, probability: prediction[0][activityIndex] };
          })
          .sortBy('probability')
          .value();
      });
    },

    // TODO improve frequency prediction api (probably classifier api), by
    // allowing filtering (last week and meal only specie) results? For now
    // take last frequency and specie prediction by hand
    createActivityFrequencyMap(type = 'browse', behaviors, context) {
      const {frequency} = this.classifiers;
      frequency.context = context;
      return frequency.predict(behaviors).then((predictions) =>
        _(frequencies).filter(['specie', type]).sortBy('week').value().pop().frequency
      );
    }
  }
}));

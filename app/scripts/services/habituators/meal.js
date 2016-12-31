'use strict';


Habit.add(stampit({
  init () {
    // FIXME! get trained classifiers
    this.hungerer  = Re.estimators.estimators[2].hunger    || Classifier.get('hunger');
    this.dayTime   = Re.estimators.estimators[6].dayTime   || Classifier.get('dayTime');
    this.frequency = Re.estimators.estimators[6].frequency || Classifier.get('frequency');
  },
  refs: {
    name: 'meal'
  },
  methods: {
    // TODO predict people at moment
    habitualize (ocurrences, context) {
      let now = new Date(), prediction,
      // TODO better guessing of meal macronutrients
        macronutrients = {
          carbohydrate: 0.4,
          protein: 0.25,
          fat: 0.25,
          fiber: 0.1
        };

      return this.getHabitualMealTimes(ocurrences, context).then((mealTimes) => {
        mealTimes.forEach((mealTime) => {
          let start = mealTime.pop(), end = mealTime.pop();
          // TODO infer venue for the habit, probably from context?
          // for now just add todays one sleep habit ocurrence ;D
          ocurrences.push(Activity({
            // TODO add this properties
            // areaId     : this.healthArea.provider.id,
            // TODO better way to generate a temporary id
            provider      : {id: (Math.random() * 10000).toFixed(), name: 'relisse'},
            // quality    : x,
            // TODO predict features
            features      : {
              start       : start,
              duration: {
                estimated: (end - start) / 1000
              }
            },
            habituality   : {},
            status        : 'open', // TODO predict status correctly
            activity      : {type: 'meal'},
            name          : 'Meal',
            notes         : 'Probably you have eaten at this time today.',
            start         : start,
            end           : end,
            macronutrients: macronutrients,
            createdAt     : now,
            updatedAt     : now,
            completedAt   : end
          }));

        });

        return ocurrences;
      });
    },

    getHabitualMealTimes(behaviors, context) {
      this.frequency.context = context;

      return Promise.all([this.frequency.predict(behaviors), this.getDayTimeMealProbability(behaviors, context)])
        .then((resolutions) => {
          let frequencies = resolutions[0], probabilities = resolutions[1];

          frequencies = _.findLast(frequencies, {specie: 'meal'})

          // TODO usar uma distribuição melhor de refeições por semana do que dividir por 7
          let amount = Math.round(frequencies.frequency / 7), start, end,
            hours = _.map(probabilities.slice(0, amount), 'hour');

          return hours.map((hour) => {
            // TODO guess meal duration
            start = moment(context.calendar.now).startOf('hour').hour(hour);
            end   = start.clone().add(15, 'minutes');

            return [start.toDate(), end.toDate()];
          });
        });
    },

    getDayTimeMealProbability (behaviors, context) {
      let start = moment(context.calendar.now).startOf('day'), end = start.clone().add(1, 'day'),
        cursor = _.cloneDeep(context), predicts = [];

      while (start.isBefore(end)) {
        // TODO increase granularity of daytime activity prediction
        cursor.calendar.now = start.add(1, 'hour').toDate();
        this.dayTime.context = cursor;
        predicts.push(this.dayTime.predict(behaviors, {limit: 1}));
      }

      return Promise.all(predicts).then((predictions) => {
        let mealActivityIndex = this.dayTime.mapper.types.indexOf('meal');

        return _(predictions).map((prediction, index) => {
          return {
            hour: index,
            probability: prediction[0][mealActivityIndex]
          };
        })
        .sortBy('probability')
        .value();
      });
    }
  }
}));

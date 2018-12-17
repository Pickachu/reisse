'use strict';


Habit.add(stampit({
  init () {
    // FIXME get trained classifiers
    this.hungerer  = Re.estimators && Re.estimators.estimators[2].hunger    || Classifier.get('hunger');
    this.dayTime   = Classifier.get('dayTime/meal');
    this.frequency = Re.estimators && Re.estimators.estimators[6].frequency || Classifier.get('frequency');
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

      return this.dayTime.learn(ocurrences)
        .then(() =>
          this.getHabitualMealTimes(ocurrences, context).then((mealTimes) => {
            mealTimes.forEach(([start, end]) => {
              // TODO infer venue for the habit, probably from context?
              // for now just add todays one sleep habit ocurrence ;D
              ocurrences.push(Activity({
                // TODO add this properties
                // areaId     : this.healthArea.provider.id,
                // TODO better way to generate a temporary id
                provider      : {id: (Math.random() * 10000).toFixed(), name: 'relisse'},
                // quality    : x,
                // TODO guess all other features
                features      : {
                  start       : start,
                  duration: {
                    estimated: end - start
                  }
                },
                habituality   : {},
                status        : 'complete',
                activity      : {type: 'meal'},
                name          : 'Habitual Meal',
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
          })
        );
    },

    getHabitualMealTimes(behaviors, context) {

      // TODO consider already happened behaviors when selecting meal time activity
      return Promise.all([
          this.getDayMealFrequency(behaviors, context),
          this.getDayTimeMealProbabilities(behaviors, context),
          this.getMisteriousTime(behaviors, context),
        ])

        .then(([frequency, probabilities, slots]) => {

          return _(probabilities)
            .filter(({hour}) =>
              slots.some(({start, end}) =>
                // TODO make probabilities return a timestamp inside current context
                // instead of raw daytime hours, because if ending hour is midnight,
                // moment().hour() will return zero. also check with timestamps instead of hours.
                moment(start).hour() <= hour && hour <= (moment(end).hour() || 24)
              )
            )
            .slice(0, frequency)
            .map(({hour}) => {
              let start, end;

              // TODO improve guessing of meal duration
              start = moment(context.calendar.now).startOf('hour').add(hour * 60, 'minutes');
              end   = start.clone().add(5, 'minutes');

              return [start.toDate(), end.toDate()];
            });
        });
    },

    getDayMealFrequency (behaviors, context) {
      this.frequency.context = context;
      // Fix frequency predictor because of 2018, test misterious slots
      return this.frequency
        .predict(behaviors)
        .then((predictions) => {
          const meal = _.findLast(predictions, {specie: 'meal'})
          // TODO usar uma distribuição melhor de refeições por semana do que dividir por 7
          return Math.round(meal.frequency / 7);
        });
    },

    getDayTimeMealProbabilities (behaviors, context) {
      const {mapper} = this.dayTime;
      let limit = 30;

      return _.chain(this.dayTime)
        .set('context', context)
        .invoke('predictTrend', behaviors, {
          limitReached(last) { limit -= 1; return limit < 0; } // Keep generating
        })
        .map(mapper.denormalize, mapper)
        .groupBy( h => h.toFixed(0) )
        .mapValues( hours => ({hour: ss.average(hours), probability: hours.length}) )
        .sortBy('probability')
        .reverse()
        .value()
    },

    performate (ocurrences) {
      const initial = ocurrences.length;
      return this.frequency
        .learn(ocurrences)
        .then(() => Context().for(moment().startOf('day').toDate()))
        .then((context) => this.habitualize(ocurrences, context))
        .then((ocurrences) => {
          return {
            graphs: ocurrences
              .slice(initial - 1, ocurrences.length)
              .map((ocurrence) => ({event: ocurrence}))
            };
        })
    }
  },

}));

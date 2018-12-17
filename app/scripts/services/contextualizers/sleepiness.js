'use strict';


Context.add(stampit({
  init () {
    // TODO receive classifiers as parameters
    this.sleepiness = Classifier.sleepiness;
  },
  refs: {
    name: 'sleepiness',
    async contextualize (moment) {
      this.when('calendar').then((context) => {
        if (!this.sleepiness.learned) {
          console.error(`[context:${this.name}] using untrained sleepiness it's useless`);
        }
        context.sleepiness = this.sleepiness.predict([], {context});
      });
    },
    // findNearestMeasurement(context) {
    //   if (!Context.nearestHungerMeasurement) {
    //     // TODO use current hunger from estimator instead of inferring it from ocurrences
    //     let behavior = _(Re.estimators.occurrences || app.ocurrences)
    //       .sort('start')
    //       .findLast((b) => b.features && Number.isFinite(b.features.hunger.truer))
    //       .value();
    //
    //     Context.nearestHungerMeasurement = {
    //       hunger: behavior.features.hunger.truer,
    //       when  : behavior.context.calendar.now
    //     }
    //   }
    //
    //   return Context.nearestHungerMeasurement;
    // },
    // guessNearestMeasurement(context) {
    //   // TODO better guessing of meal macronutrients
    //   let macronutrients = {
    //     carbohydrate: 0.4,
    //     protein: 0.25,
    //     fat: 0.25,
    //     fiber: 0.1
    //   };
    //
    //   let predictActivityTypeByDaytime = (behaviors, context) => {
    //     let start = moment(context.calendar.now).startOf('day'), end = start.clone().add(1, 'day'),
    //       cursor = _.cloneDeep(context);
    //
    //     while (start.isBefore(end)) {
    //       // TODO increase granularity of daytime activity prediction
    //       cursor.calendar.now = start.add(1, 'hour').valueOf();
    //       this.dayTime.context = cursor;
    //       predicts.push(this.dayTime.predict(behaviors, {limit: 1}));
    //     }
    //
    //     return Promise.all(predicts).then((dayTimes) => {
    //       let mealActivityIndex = this.dayTimes.mapper.types.indexOf('meal').toString();
    //
    //       return _(dayTimes).map((dayTime, index) => {
    //         return {
    //           hour: index,
    //           probability: dayTime[mealActivityIndex]
    //         };
    //       })
    //       .sortBy('probability')
    //       .value();
    //     });
    //   };
    //
    //   this.frequency.context = context;
    //
    //   Promise.all([this.frequency.predict(behaviors), predictActivityTypeByDaytime(behaviors, context)])
    //     .then((frequencies, probabilities) => {
    //       // TODO usar uma distribuição melhor de refeições por semana do que dividir por 7
    //       let amount = Math.round(frequencies.meal / 7), start,
    //         hours = _.map(probabilities.slice(0, amount), 'hour');
    //
    //       hours.forEach((hour) => {
    //         start = moment(context.calendar.now).startOf('hour').hour(hour);
    //       });
    //
    //       while (amount > 0) {
    //         amount -= 1;
    //         // TODO guess meal duration
    //         start = moment(context.calendar.now).startOf('hour').hour(probabilities.pop().hour);
    //         end   = start.clone().add(15, 'minutes');
    //       }
    //     });
    // }
  }
}));

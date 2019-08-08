'use strict';

// Chance estimator
// • It is part of our job as an app to provide an actual guess of behavioral
// chance for the datasets we receive.
// • The actual chance value should be prediction based on actual measurable
// values for occurrences that have happened.
// • For now this values are:
// - task status
// - high sensation
Estimator.add(stampit({
  refs: {
    name: 'chance',

    estimateFunctionMap: new Map([
      [Ocurrence, 'forOccurrence'],
      [Task, 'forTask'],
      [Activity, 'forActivity'],
      ['sleep', 'forSleep'],
      ['nap', 'forNap'],
      ['meal', 'forMeal'],
      ['browse', 'forBrowse'],
      ['watch', 'forWatch']
    ]),

    // TODO use occurrences from when promise instead of parameter
    async estimate (occurrences) {
      // TODO do not use anticipation classifier here, it is used to get context
      // of past occurrence filled. Fill past occurrences context with some
      // kind of contextual estimator
      return this.when('sensation', 'anticipation').then(() =>
        this.inferActualChance(this.inferrableSet(occurrences))
      );
    },

    inferActualChance(occurrences) {
      occurrences.forEach((occurrence) => {
        let factors = [], activityType;
        const {features, context} = occurrence;
        const {estimateFunctionMap: estimators} = this;

        // Status tells us wheter the occurrence happened or not
        // Using as a indicator that a trigger happened with suficient motivation and simplicity
        factors.push(this[estimators.get(occurrence.getStamp())](occurrence));

        // Sensations work as a trigger for some (TODO define which) occurrences.
        // Using as a proxy for internal user triggers
        factors.push(features.sensation.actual || 0.5);

        // Time of the day work as a trigger for some (TODO define which) occurrences.
        if (context.calendar && context.calendar.now) {
          factors.push(this._timeFactorFromDate(context.calendar.now));
        }
        // ! TODO think about other proxy for triggers that i can measure

        // if (occurrence.activity && (activityType = occurrence.type || occurrence.activity.type)) {
        //   const {estimateFunctionMap: estimators} = this;
        //
        //   if (!this[estimators.get(activityType)]) {
        //     throw new TypeError(`chance estimator not implemented yet for ${activityType}.`);
        //   }
        //   chance += this[estimators.get(activityType)](occurrence);
        // }

        features.chance.actual = ss.average(factors);
      });
    },

    forOccurrence ({status}) {
      return this._chanceFromStatus(status);
    },

    forTask ({status}) {
      return this._chanceFromStatus(status);
    },

    forActivity ({status}) {
      return this._chanceFromStatus(status);
    },

    // TODO
    // forSleep (sleep) {
    //   return 0;
    // },
    //
    // forNap (sleep) {
    //   return 0;
    // },
    //
    // forMeal (meal) {
    //   return 0;
    // },
    //
    // forBrowse (browse) {
    //   return 0;
    // },
    //
    // forWatch (watch) {
    //   return 0;
    // },

    _chanceFromStatus(status) {
      switch (status) {
        // Completed things are by definition a behavior/action that was performed
        // so the actual chance that it happened is 100%
        case 'complete': return 1;
        // Open things are by definition a behavior/action are to be performed
        // so the actual chance that it happened is 0%
        case 'open': return 0;
        // Canceled things are by definition a behavior/action that was not performed
        // so the actual chance that it happened is 0%
        case 'cancel' : return 0;
        default: throw new `TypeError Invalid task state ${status}.`
      };
    },

    _timeFactorFromDate(date) {
      const miliseconds = moment(date)
        .startOf('day')
        .diff(date, 'miliseconds');

      return Math.abs(miliseconds) / (24 * 60 * 60 * 1000);
    }

  }
}));

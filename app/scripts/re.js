/* globals Estimator, Classifiers  */
/* exports Re */

'use strict';

var byChance = (a, b) => b.chance - a.chance

var Re = stampit({
  static: {
    DEFAULT_OCURRENCE_DURATION: 25 * 60, // A pomodoro

    // TODO refactor classifiers as esitmators and contextualizers
    chance: Classifiers.Chance,

    // Estimates actual values:
    // - mainly for past ocurrences
    // - for future ocurrences just do some basic normalization
    estimate (ocurrences, areas) {
      ocurrences = ocurrences.map(Ocurrence.fromJSON, Ocurrence);
      return Estimators({ocurrences: ocurrences, areas: areas}).estimate();
    },

    // Train classifiers to classify ocurrences
    learn(ocurrences) {
      let learnable = this.learnableSet(ocurrences);
      this.chance.stage();
      this.chance.learn(learnable);
      return {amount: learnable.length};
    },

    // ! TODO Move lernable set to classifier base class
    learnableSet (ocurrences) {
      let past, now = Date.now(),
        inPast  = (ocurrence) => ocurrence.start && ocurrence.start < now;

      // Only learn from past ocurrences that actualy happened
      return ocurrences.filter(inPast)

        // Clone and instantiate dataset
        .map(Ocurrence.fromJSON, Ocurrence);
    },

    // - Predict ocurrences most likely to happen
    // - Also generate good suggestions
    predict(ocurrences) {
      return Context().current()
        .then((context) => {
          return Suggester({
            ocurrences: ocurrences,
            context: context
          });
        })
        .then((resolutions) => {
          let ocurrences = resolutions[0],
            context      = resolutions[1],
            future       = this.predictableSet(ocurrences);

          this.chance.context = context;
          this.chance.predict(future);

          // Incorporate features in ocurrence to save prediction on database
          future.map((ocurrence) => ocurrence.incorporate());

          return future;
        });
    },

    // Only try to predict future ocurrences (do not already have a prediction attached and it is not already done)
    predictableSet (ocurrences) {
      return ocurrences
      // Clone and instantiate dataset
      // TODO reverse this order, when data is reimported to avoid tons of useless instances
      .map(Ocurrence.fromJSON, Ocurrence)
      .filter((ocurrence) => ocurrence.status === 'open');

    },

    // TODO move to context
    _computeAvailableTime () {
        let oneDay = ICAL.Duration.fromSeconds(24 * 60 * 60), midnight = ICAL.Time.now(), available;

        midnight.hour  = midnight.minute = midnight.second = 0;
        midnight.addDuration(oneDay);
        available      = midnight.subtractDate(ICAL.Time.now()).toSeconds();

        return available;
    },
    lisse(ocurrences) {
      // TODO create a prediction for each context
      return this.predict(ocurrences).then((prediction) => {
        let midnight = ICAL.Time.now(), oneDay = ICAL.Duration.fromSeconds(24 * 60 * 60),
          lisse, range;

        midnight.hour = midnight.minute = midnight.second = 0;
        range = [ midnight, midnight.clone().addDuration(oneDay)]

        lisse = this._predictedEventsForToday(range, ocurrences, prediction);
        // Add already completed events from today at the beginning of time
        lisse = this._pastEventsFromToday(range, ocurrences).concat(lisse);
        lisse = this._suggestedEventsForToday(range, ocurrences).concat(lisse);
        return lisse;
      });
    },

    _predictedEventsForToday(range, ocurrences, prediction) {
      let available = this._computeAvailableTime(range), lisse, start = ICAL.Time.now();

      prediction = prediction.sort(byChance);

      // TODO predict duration start instead of setting it by hand

      lisse = prediction.filter((ocurrence, index, prediction) => {
        let seconds  = ocurrence.features.duration.estimated || this.DEFAULT_OCURRENCE_DURATION,
            duration = ICAL.Duration.fromSeconds(seconds);

        ocurrence.features.start = start.toJSDate();
        start.addDuration(duration);
        ocurrence.features.end   = start.toJSDate();

        available -= seconds;
        return available >= 0;
      });

      if (lisse.length > 50) {
        console.error("app: Your prediction probably failed and was handicapped to only 50 results.");
        lisse = lisse.splice(0, 50);
      }

      return lisse;
    },

    _pastEventsFromToday(range, ocurrences) {
      let comparable = range[0]; // normaly range[0] === todays midnight
      return ocurrences.filter((o) => o.completedAt && o.completedAt > comparable );
    },

    _suggestedEventsForToday (range, ocurrences) {
      // TODO use range
      let today = new Date().getDay();
      return ocurrences.filter((o) =>
        o.suggestion && o.start.getDay() === today
      );
    }
  }
});

/* globals Estimator, Classifiers  */
/* exports Re */

'use strict';

var byChance = (a, b) => b.chance - a.chance

var Re = stampit({
  static: {
    DEFAULT_OCURRENCE_DURATION: 25 * 60, // A pomodoro

    // TODO refactors classifiers as esitmators and contextualizers
    chance: Classifiers.Chance,

    estimate (ocurrences, areas) {
      ocurrences = ocurrences.map(Ocurrence.fromJSON, Ocurrence);
      return Estimators({ocurrences: ocurrences, areas: areas}).estimate();
    },

    learn(ocurrences) {
      let learnable = this.learnableSet(ocurrences);
      this.chance.initialize();
      this.chance.learn(learnable);
      return {amount: learnable.length};
    },

    learnableSet (ocurrences) {
      let past, now = Date.now(),
        inPast  = (ocurrence) => ocurrence.start && ocurrence.start < now && ocurrence.features.chance.actual;

      // Only learn from past ocurrences that actualy happened
      return ocurrences.filter(inPast)

        // Clone and instantiate dataset
        .map(Ocurrence.fromJSON, Ocurrence);
    },

    predict(ocurrences) {
        return Context().current().then((context) => {
          let future = this.predictableSet(ocurrences);

          this.chance.context = context;
          this.chance.predict(future);

          // Incorporate features in ocurrence to save prediction on database
          future.map((ocurrence) => ocurrence.incorporate());

          return future;
        });
    },

    // Only try to predict future ocurrences (do not already have a prediction attached and it is not already done)
    predictableSet (ocurrences) {
      return ocurrences.filter((ocurrence) => ocurrence.status == 'open')

        // Clone and instantiate dataset
        .map(Ocurrence.fromJSON, Ocurrence);
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
      return this.predict(ocurrences).then((prediction) => {
        let available = this._computeAvailableTime(), lisse;

        prediction = prediction.sort(byChance);

        lisse = prediction.filter((ocurrence) => {
          // available -= ocurrence.duration || ocurrence.estimatedDuration || area.avarageDuration
          available -= ocurrence.features.duration.estimated || this.DEFAULT_OCURRENCE_DURATION;
          return available >= 0;
        });

        if (lisse.length > 50) {
          console.error("app: Your prediction probably failed and was handicapped to only 30 results.");
          lisse = lisse.splice(0, 30);
        }

        return lisse;
      });
    }
  }
});

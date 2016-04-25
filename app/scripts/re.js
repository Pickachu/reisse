/* globals Estimator, Classifiers  */
/* exports Re */

'use strict';

var byChance = (a, b) => b.chance - a .chance

var Re = stampit({
  static: {
    DEFAULT_OCURRENCE_DURATION: 25 * 60, // A pomodoro
    chance: Classifiers.Chance,

    estimate (ocurrences, areas) {
      ocurrences = ocurrences.map(Ocurrence.fromJSON, Ocurrence);

      let estimator = Estimator({ocurrences: ocurrences, areas: areas});
      estimator.estimate();
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
        let future, now = Date.now();

        // Only try to predict future ocurrences (do not already have a prediction attached and it is not already done)
        future = ocurrences.filter((ocurrence) => ocurrence.status == 'open');

        // Clone and instantiate dataset
        future = future.map(Ocurrence.fromJSON, Ocurrence);


        this.chance.predict(future);

        // Incorporate features in ocurrence
        future.map((ocurrence) => ocurrence.incorporate());
        return future;
    },

    _computeAvailableTime () {
        let oneDay = ICAL.Duration.fromSeconds(24 * 60 * 60), midnight = ICAL.Time.now(), available;

        midnight.hour  = midnight.minute = midnight.second = 0;
        midnight.addDuration(oneDay);
        available      = midnight.subtractDate(ICAL.Time.now()).toSeconds();

        return available;
    },
    lisse(ocurrences) {
        let lisse = [], available;

        ocurrences = this.predict(ocurrences).sort(byChance);
        available  = this._computeAvailableTime();

        lisse     = lisse.concat(ocurrences.filter((ocurrence) => {
            available -= ocurrence.features.duration.estimated || this.DEFAULT_OCURRENCE_DURATION;
            return available >= 0;
        }));

        // areas.forEach((area) => {
        //     let ocurrences = area.ocurrences, available;
        //     available = area.avarageDuration
        //     lisse     = lisse.concat(ocurrences.filter((ocurrence) => {
        //         available -= ocurrence.duration || ocurrence.estimatedDuration || area.avarageDuration
        //         return available >= 0;
        //     }));
        // });

        if (lisse.length > 50) {
            console.error("app: Your prediction probably failed and was handicapped to only 30 results.");
            lisse = lisse.splice(0, 30);
        }
        return lisse;
    }
  }
});

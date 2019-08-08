/* globals Estimator, Classifier  */
/* exports Re.Estimation */

'use strict';

Re.Estimation = stampit({
  static: {
    // Estimates actual values:
    // - mainly for past occurrences
    // - for future occurrences just do some basic normalization
    // - TODO document domain values estimation
    estimate (occurrences, areas) {
      // Reset all classifiers
      Classifier.stage();
      this.stage = 'past occurrences estimation';

      console.log(`[re.estimation] instantiating dataset`);
      this.estimators = Estimators({
        occurrences: occurrences.map(Ocurrence.fromJSON, Ocurrence),
        areas
      });

      console.log(`[re.estimation] estimation`);
      return this.estimators.estimate();
    }
  }
});

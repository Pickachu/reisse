/* globals Estimator, Classifier  */
/* exports Re.Estimation */

'use strict';

Re.Estimation = stampit({
  static: {
    // Estimates actual values:
    // - mainly for past occurrences
    // - for future occurrences just do some basic normalization
    estimate (occurrences, areas) {
      // Reset all classifiers
      Classifier.stage();
      this.stage = 'past occurrences estimation';

      occurrences = occurrences.map(Ocurrence.fromJSON, Ocurrence);
      this.estimators = Estimators({occurrences, areas});

      return this.estimators.estimate();
    }
  }
});

/* globals Estimator, Classifier  */
/* exports Re.Estimation */

'use strict';

Re.Estimation = stampit({
  static: {
    // Estimates actual values:
    // - mainly for past ocurrences
    // - for future ocurrences just do some basic normalization
    estimate (ocurrences, areas) {
      // Reset all classifiers
      Classifier.stage();

      ocurrences = ocurrences.map(Ocurrence.fromJSON, Ocurrence);
      this.estimators = Estimators({ocurrences: ocurrences, areas: areas});

      return this.estimators.estimate();
    }
  }
});

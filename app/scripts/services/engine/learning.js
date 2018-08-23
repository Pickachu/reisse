/* globals Estimator, Classifier  */
/* exports Re */

'use strict';

Re.Learning = stampit({
  static: {

    // Train classifiers to classify ocurrences
    learn(ocurrences) {
      let learnable = this.learnableSet(ocurrences);

      this.chance = Classifier.chance;
      this.chance.learn(learnable).then(() => alert('learned'));

      return {amount: learnable.length};
    },

    // TODO Move lernableSet to classifier and estimators base class
    learnableSet (ocurrences) {
      // Only learn from past ocurrences that actualy happened
      return ocurrences.filter((ocurrence) => ocurrence.status === 'complete');
    }

  }
});

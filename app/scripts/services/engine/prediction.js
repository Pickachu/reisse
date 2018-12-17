/* globals Estimator, Classifier  */
/* exports Re.Prediction */

'use strict';

Re.Prediction = stampit({
  static: {

    /**
     * Predict occurrences most likely to happen at a given context
     * • The given prediction set will be filtered by executable occurrences only
     * this occurrences can be on the past, present or future
     * • A main property of context is the calendar.now timestamp, all occurrences
     * are thought of happening at this time
     *
     * @param  {Ocurrence[]} occurrences [description]
     * @param  {Context} context    [description]
     *
     * @return {Ocurrence[]}   the predicted occurrences sorted by probability of
     * beign executed on the given contex
     */
    predict(occurrences, context) {
      let set = this.predictableSet(occurrences);

      // Predict chance for ocorrence set
      return this.chance
        .predict(set, {context})
        // TODO return set through promises
        // Incorporate features in occurrence to save prediction on database
        .then( () => set.forEach((occurrence) => occurrence.incorporate()) )
        // TODO return set through promises
        // Return prediction set
        .then( () => set );
    },

    // Only try to predict unexecuted occurrences (status !== completed)
    // TODO filter already predicted occurrences?
    predictableSet (occurrences) {
      return occurrences
      // Clone and instantiate dataset
      // TODO reverse this order, when data is reimported to avoid tons of useless instances
      .map(Ocurrence.fromJSON, Ocurrence)
      .filter(({status}) => status === 'open');

    }
  }
});

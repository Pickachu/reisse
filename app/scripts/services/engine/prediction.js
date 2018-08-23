/* globals Estimator, Classifier  */
/* exports Re.Prediction */

'use strict';

Re.Prediction = stampit({
  static: {

    /**
     * Predict ocurrences most likely to happen at a given context
     * • The given prediction set will be filtered by executable ocurrences only
     * this ocurrences can be on the past, present or future
     * • A main property of context is the calendar.now timestamp, all ocurrences
     * are thought of happening at this time
     *
     * @param  {Ocurrence[]} ocurrences [description]
     * @param  {Context} context    [description]
     *
     * @return {Ocurrence[]}   the predicted ocurrences sorted by probability of ocurrence
     * beign executed on the given contex
     */
    predict(ocurrences, context) {
      let set = this.predictableSet(ocurrences);

      this.chance.context = context;

      // Predict chance for ocorrence set
      return this.chance
        .predict(set)
        // TODO return set through promises
        // Incorporate features in ocurrence to save prediction on database
        .then( () => set.forEach((ocurrence) => ocurrence.incorporate()) )
        // TODO return set through promises
        // Return prediction set
        .then( () => set );
    },

    // Only try to predict unexecuted ocurrences (status !== completed)
    // TODO filter already predicted ocurrences
    predictableSet (ocurrences) {
      return ocurrences
      // Clone and instantiate dataset
      // TODO reverse this order, when data is reimported to avoid tons of useless instances
      .map(Ocurrence.fromJSON, Ocurrence)
      .filter((ocurrence) => ocurrence.status === 'open');

    }
  }
});

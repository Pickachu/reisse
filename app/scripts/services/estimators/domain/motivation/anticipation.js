'use strict';

// Anticipation estimator
// • Since there are no specific devices to measure/extract anticipation values from humans
// and we are using the BJ Fogg conceptual anticipation construct.
// • The actual anticipation value is a prediction based on other measurable
// values (responsibilityArea for now) for occurrences that have happened.
// TODO use anticipation classifier here! also this anticipation estimator is, for now,
// mainly for guessing the context whith which some occurrence happened
// TODO perhaps is a great idea to move BJFogg factors estimation to the domain model?
Estimator.add(stampit({
  refs: {
    name: 'anticipation'
  },
  init () {
    // TODO improve classifier reusage
    // All responsibility area classifier learns with the same set, so reuse it here to save time
    this.responsibilityArea = Classifier['responsibility-area'] || Estimator.responsibilityArea;
  },
  methods: {
    estimate(occurrences) {
      const learnable = this.inferrableSet(occurrences)

      // TODO only used for responsibility area prediction, remove from this estimator and create
      // a context estimator better estimate task context
      this.contextualize(learnable);

      // TODO reuse responsibility area neural net on anticipation classifier
      this.responsibilityArea.learn(learnable);

      this.inferActualAnticipation(learnable);

      return Promise.resolve(true);
    },

    contextualize (occurrences) {
      occurrences.forEach((occurrence) => {
        [occurrence.start, occurrence.completedAt].forEach((now) => {
          // TODO fix asana importer to correctly import start dates
          if (now && !now.toString().includes('Invalid Date')) {
            // TODO update occurrence duration estimator and use only start time
            occurrence.context.calendar = {now};
          }
        });
      });

      let ignores = occurrences.filter(({context}) => !context.calendar.now);
      console.warn(`[estimator.anticipation.contextualize] ignored
        contextualization for ${ignores.length}/${occurrences.length}` );

    },

    inferActualAnticipation (occurrences) {
      const predictions = this.responsibilityArea.predict(occurrences);
      occurrences.forEach((occurrence, index) => {
        // Prediction is an array with estimated anticipation for each
        // responsibility area at that day time. Get the aticipation related
        // to this occurrence responsibility area
        const prediction = predictions[index],
        area = this.responsibilityArea.areaIds.indexOf(occurrence.areaId);

        // FIXME some occurrences are coming without responsibility area!
        occurrence.features.anticipation.actual = prediction[area] || 0.5;
      });
    }
  }
}));

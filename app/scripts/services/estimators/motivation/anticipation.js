'use strict';

estimators.anticipation = estimatorable.compose(stampit({
  init () {
    if (!estimators.anticipation.responsibilityArea) {
      estimators.anticipation.responsibilityArea = Classifier.responsibilityArea;
    }

    this.responsibilityArea = estimators.anticipation.responsibilityArea;
  },
  methods: {
    estimate(ocurrences) {
      let learnable = this.inferrableSet(ocurrences);

      // TODO only used for responsibility area prediction, remove from this estimator and create
      // a context estimator better estimate task context
      this.contextualize(learnable);

      // TODO reuse responsibility area neural net on anticipation classifier
      this.responsibilityArea.learn(learnable);

      this.inferActualAnticipation(learnable);
    },

    contextualize (ocurrences) {
      ocurrences.forEach((ocurrence) => {
        // TODO update ocurrence duration estimator and use only start time
        ocurrence.context.calendar = {now: ocurrence.start || ocurrence.completedAt};
      });
    },

    inferActualAnticipation (ocurrences) {
      let predictions = this.responsibilityArea.predict(ocurrences);
      ocurrences.forEach((ocurrence, index) => {
        // Prediction is an array with estimated anticipation for each
        // responsibility area at that day time. Get the aticipation related
        // to this ocurrence responsibility area
        let prediction = predictions[index],
        area = this.responsibilityArea.areaIds.indexOf(ocurrence.areaId);

        // FIXME some ocurrences are coming without responsibility area!
        ocurrence.features.anticipation.actual = prediction[area] || 0.5;
      });
    }
  }
}));

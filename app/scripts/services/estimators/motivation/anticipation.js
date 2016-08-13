'use strict';

estimators.anticipation = stampit({
  init () {
    if (!estimators.anticipation.responsibilityArea) {
      estimators.anticipation.responsibilityArea = Classifiers.ResponsibilityArea({areas: this.areas});
    }

    this.responsibilityArea = estimators.anticipation.responsibilityArea;
  },
  methods: {
    estimate(ocurrences) {
      let learnable = Re.learnableSet(ocurrences);

      // TODO reuse responsibility area neural net on anticipation classifier
      this.contextualize(learnable);
      this.responsibilityArea.learn(learnable);

      this.inferActualAnticipation(learnable);
    },

    contextualize (ocurrences) {
      ocurrences.forEach((ocurrence) => {
        // TODO use other property than completedAt, after infering task execution
        // by pomodoro duration
        ocurrence.context.calendar = {now: ocurrence.start};
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
});

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
      this.contextualize(ocurrences);

      // TODO reuse responsibility area neural net on anticipation classifier
      this.responsibilityArea.learn(learnable);

      this.inferActualAnticipation(ocurrences);
    },

    contextualize (ocurrences) {
      let startTime = new Date();
      ocurrences.forEach((ocurrence) => {
        // TODO use other property than completedAt, after infering task execution
        // by pomodoro duration
        ocurrence.context.startTime = ocurrence.completedAt || startTime;
      });
    },

    inferActualAnticipation (ocurrences) {
      let predictions = this.responsibilityArea.predict(ocurrences);
      ocurrences.forEach((ocurrence, index) => {
        let prediction = predictions[index],
        area = this.responsibilityArea.areaIds.indexOf(ocurrence.areaId);

        // Prediction is an array with estimated anticipation for each
        // responsibility area at that day time. Get the aticipation related
        // to this ocurrence responsibility area

        // FIXME some ocurrences are coming without responsibility area!
        ocurrence.features.anticipation.actual = prediction[area] || 0.5;
      });
    },
    predict(behaviors) {
      behaviors.forEach((behavior) => {
          this.responsibilityArea.perceptron.activate();
      });
    }
  }
});

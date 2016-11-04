'use strict';

estimators.sensation = stampit({
  init () {
    if (!estimators.sensation.sleepiness) {
      estimators.sensation.sleepiness = Classifier.sleepiness;
    }

    this.sleepiness = estimators.sensation.sleepiness;
  },
  methods: {
    estimate(ocurrences) {
      let learnable = Re.learnableSet(ocurrences);

      // TODO reuse responsibility area neural net on sensation classifier
      this.contextualize(learnable);
      this.sleepiness.learn(learnable);

      this.inferActualSensation(learnable);
    },

    contextualize (ocurrences) {
      ocurrences.forEach((ocurrence) => {
        // TODO use other property than completedAt, after infering task execution
        // by pomodoro duration
        ocurrence.context.calendar = {now: ocurrence.start};
      });
    },

    inferActualSensation (ocurrences) {
      let predictions = this.sleepiness.predict(ocurrences);
      ocurrences.forEach((ocurrence, index) => {
        // Prediction is an array with estimated sensation for each
        // responsibility area at that day time. Get the aticipation related
        // to this ocurrence responsibility area
        let prediction = predictions[index],
        area = this.sleepiness.areaIds.indexOf(ocurrence.areaId);

        // FIXME some ocurrences are coming without responsibility area!
        ocurrence.features.sensation.actual = prediction[area] || 0.5;
      });
    }
  }
});

'use strict';

Classifier.add(stampit({
  refs: {
    name: 'anticipation'
  },
  init () {
    let Architect   = synaptic.Architect;

    // TODO use anticipation classifier
    // TODO better way to reuse ResponsibilityArea estimator classifier
    this.responsibilityArea = estimators.anticipation.responsibilityArea || Classifier.get('responsibilityArea');
  },
  methods: {
      learn(behaviors) {
        return this.responsibilityArea.learn(behaviors);
      },
      predict(behaviors) {
        this.responsibilityArea.context = this.context;
        let predictions = this.responsibilityArea.predict(behaviors);
        behaviors.forEach((behavior, index) => {
          // Prediction is an array with estimated anticipation for each
          // responsibility area at that day time. Get the aticipation related
          // to this ocurrence responsibility area
          let prediction = predictions[index],
          area = this.responsibilityArea.areaIds.indexOf(behavior.areaId);

          behavior.features.anticipation.estimated = prediction[area] || 0.5;
        });
      }
  }
}));

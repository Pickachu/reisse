'use strict';

Classifier.add(stampit({
  refs: {
    name: 'anticipation'
  },
  init () {
    let Architect   = synaptic.Architect;

    // TODO better way to reuse ResponsibilityArea estimator classifier
    this.responsibilityArea = (Estimator.find('anticipation') || {}).responsibilityArea || Classifier.get('responsibilityArea');
  },
  methods: {
    learn(behaviors) {
      return this.responsibilityArea.learn(behaviors);
    },
    predict(behaviors) {
      this.responsibilityArea.context = this.context;
      let predictions = this.responsibilityArea.predict(behaviors);
      return Promise.resolve(behaviors.map((behavior, index) => {
        // Prediction is an array with estimated anticipation for each
        // responsibility area at that day time. Get the anticipation related
        // to this ocurrence responsibility area
        let prediction = predictions[index],
        area = this.responsibilityArea.areaIds.indexOf(behavior.areaId);

        return prediction[area] || 0.5;
      }));
    }
  }
}));

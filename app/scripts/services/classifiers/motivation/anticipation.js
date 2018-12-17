'use strict';

Classifier.add(stampit({
  init () {
    let Architect   = synaptic.Architect;

    // TODO better way to reuse ResponsibilityArea estimator classifier
    this.responsibilityArea = (Estimator.find('anticipation') || {}).responsibilityArea || Classifier.get('responsibility-area');
  },
  refs: {
    name: 'anticipation',
    learn(behaviors) {
      return this.responsibilityArea.learn(behaviors);
    },
    async predict(behaviors, {context}) {
      this.responsibilityArea.context = context;
      const predictions = this.responsibilityArea.predict(behaviors, {context});
      return behaviors.map((behavior, index) => {
        // Prediction is an array with estimated anticipation for each
        // responsibility area at that day time. Get the anticipation related
        // to this ocurrence responsibility area
        const prediction = predictions[index],
        area = this.responsibilityArea.areaIds.indexOf(behavior.areaId);

        return prediction[area] || 0.5;
      });
    }
  }
}));

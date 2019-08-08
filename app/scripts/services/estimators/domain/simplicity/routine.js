'use strict';

Estimator.add(stampit({
  init() {
    this.activityType = Classifier.get('activityType');
    this.frequency = Classifier.get('frequency');
  },
  refs: {
    name: 'routine',
    estimate (behaviors) {
      // return this.when('duration').then((resolve) => {
        // this.inferRelativeTime(behaviors);
      return this.inferActualCommonality(behaviors);
      // });
    },

    inferActualCommonality(behaviors) {
      return Promise.all([this.activityType.learn(behaviors), this.frequency.learn(behaviors)]).then(() => {
        // TODO define actual routine value here with 90% confidence (probably only for past occurrences)
        return Promise.resolve(behaviors);
      });
    },
  }
}));

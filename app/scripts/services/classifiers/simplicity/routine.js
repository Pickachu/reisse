'use strict';

Classifier.add(stampit({
  init() {
    this.stage();
  },
  refs: {
    name: 'routine',
    stage() {
      this.activityType  = Classifier.get('activityType');
    },

    learn(behaviors) {
      return this.activityType.learn(behaviors);
    },

    async predict(behaviors, {context}) {
      this.activityType.context = context;

      // TODO on activityType learn to predict behaviors based on species instead of
      // only activity type
      const mapping = await this.activityType.createProbabilityMap(behaviors, context);

      // TODO on activityType learn to predict behaviors based on species instead of
      // only activity type
      mapping.set('watch', mapping.get('browse'))

      return behaviors.map((behavior) => {
        const {features, activity = {}} = behavior;
        const activityTypeProbability = mapping.get(activity.type || 'unknown');

        features.routine.estimated = activityTypeProbability;
        return behavior;
      });
    }
  }
}));

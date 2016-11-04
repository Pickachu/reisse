'use strict';

// TODO use homeostasis classifier?
// TODO use cicardian classifier?
Classifier.add(stampit({
  refs: {
    name: 'sensation'
  },
  init () {
    // let Architect   = synaptic.Architect;

    this.sleep = Classifier.sleep;
    this.sleepiness = Classifier.sleepiness;
  },
  methods: {
      learn(behaviors) {
        this.sleep.learn(behaviors);
        this.sleepiness.learn(behaviors);
      },
      predict(behaviors) {
        let sleepiness;

        this.sleepiness.context = this.context;
        sleepiness = this.sleepiness.predict(behaviors);
        behaviors.forEach((behavior) => {
          let features = behavior.features,
            activityType = behavior.activity && behavior.activity.type,
            sensation = 1 - sleepiness;

          // TODO think how to create a rule based system to set the relationship between
          // features and activity types
          if (activityType == 'sleep' || activityType == 'nap') {
            sensation = 1 - sensation;
          }

          features.sensation.estimated = sensation;
        });
      }
  }
}));

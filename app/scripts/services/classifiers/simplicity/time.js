'use strict';

Classifier.add(stampit({
  init() {
    let Architect    = synaptic.Architect;
    this.duration    = Classifier.get('duration');
  },
  refs: {
    name: 'time',

    async learn(behaviors) {
      // let set = [], finite = Number.isFinite;
      return await this.duration.learn(behaviors);
    },
    async predict(behaviors) {
      let mapper;

      await this.duration.predict(behaviors);
      mapper = this.duration._createInputMapper(behaviors);

      behaviors.forEach((behavior) => {
        const {features} = behavior;
        if (features.duration.estimated !== undefined) {
        features.time.estimated = 1 - features.duration.estimated / mapper.maximumDuration;

        // Canceled calendar events does not have name, so they can't have an estimated duration
        // assumes that other factor will control this behavior simplicity
        } else {
          this.skips.push(behavior);
          features.time.estimated = 1;
        }
      });

      return behaviors;
    }
  }
}));

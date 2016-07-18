'use strict';

var Classifiers = Classifiers || (Classifiers = {});

Classifiers.Time = stampit({
  init() {
    let Architect    = synaptic.Architect;
    this.duration    = Classifiers.Duration();
  },
  methods: {
    learn(behaviors) {
      let set = [], finite = Number.isFinite;

      return this.duration.learn(behaviors);
    },
    predict(behaviors) {
      let mapper;
      this.duration.predict(behaviors);
      mapper = this.duration._createInputMapper(behaviors);

      behaviors.forEach((behavior) => {
        let features = behavior.features;
        features.time || (features.time = {});
        features.time.estimated = 1 - features.duration.estimated / mapper.maximumDuration;
      });

      return Promise.resolve(behaviors);
    }
  }
});

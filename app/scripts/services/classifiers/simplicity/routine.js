'use strict';

Classifier.add(stampit({
  refs: {
    name: 'routine'
  },
  init() {
    let Architect    = synaptic.Architect;
    this.dayTime    = Classifier.get('dayTime');
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
        features.routine || (features.routine = {});
        features.routine.estimated = 1 - features.duration.estimated / mapper.maximumDuration;
      });

      return Promise.resolve(behaviors);
    }
  }
}));

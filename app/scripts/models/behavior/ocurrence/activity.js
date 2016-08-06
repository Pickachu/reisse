'use strict'

var activitable = stampit({
    init() {
      Object.assign(this.features, Feature.many(this, 'duration', 'brainCycles'));
    },
    props: {
      tagNames: []
    },
    methods: {

    },
    static: {
      fromJSON (json) {
          json.createdAt   && (json.createdAt   = new Date(json.createdAt));
          json.updatedAt   && (json.updatedAt   = new Date(json.updatedAt));
          json.activatedAt && (json.activatedAt = new Date(json.activatedAt));
          json.completedAt && (json.completedAt = new Date(json.completedAt));

          switch (json.activity && json.activity.type) {
            case 'sleep':
              json.awakeAt && (json.awakeAt = new Date(json.awakeAt));
              json.asleepAt && (json.asleepAt = new Date(json.asleepAt));
              break;
          }

          return Activity(json);
      }
  }
});

var Activity = Ocurrence.compose(activitable, awarable);

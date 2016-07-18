'use strict';

Suggester.add(stampit({
  refs: {
    name: 'activity'
  },
  methods: {
    suggest (behaviors, context) {
      this.stage();

      // Suggest todays sleep activity
      this.sleep(behaviors, context);
    },

    stage (behaviors) {
      this.sleeps = Classifiers.Sleep();
    },

    sleep (behaviors, context) {
      let prediction, now = Date.now();

      this.sleeps.learn(_.filter(Re.learnableSet(behaviors), 'completedAt'));
      this.sleeps.context = context;
      prediction = this.sleeps.predict();

      behaviors.push(Activity({
        // TODO add this properties
        // areaId   : this.healthArea.provider.id,
        // TODO better way to generate a temporary id
        provider    : {id: (Math.random() * 10000).toFixed(), name: 'relisse'},
        // quality  : x,
        // TODO predict features
        // features : {},
        name        : 'Sleep',
        notes       : 'How about sleeping at this time today?',
        suggestion  : true,
        asleepAt    : prediction.asleepAt,
        awakeAt     : prediction.awakeAt,
        start       : prediction.asleepAt,
        end         : prediction.awakeAt,
        createdAt   : now,
        updatedAt   : now,
        completedAt : prediction.asleepAt
      }));
    }
  }
}));

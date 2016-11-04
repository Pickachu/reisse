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
      this.sleeps = Classifier.sleep;
    },

    // Suggest optimal sleep and nap times
    // For sleep time predict using:
    // 1. Past sleep activity (sleep classifier)
    // TODO align past sleep activity with homeostatic and cicardian timing
    // TODO move behavior creation to habitual behaviors / external service behaviors generation
    sleep (behaviors, context) {
      let prediction, now = context.calendar.now;

      this.sleeps.learn(_.filter(Re.learnableSet(behaviors), 'completedAt'));
      this.sleeps.context = context;

      prediction = this.sleeps.predict();

      // Suggest todays nap activity
      this.nap(behaviors, context);

      behaviors.push(Activity({
        // TODO add this properties
        // areaId   : this.healthArea.provider.id,
        // TODO better way to generate a temporary id
        provider    : {id: (Math.random() * 10000).toFixed(), name: 'relisse'},
        // quality  : x,
        // TODO predict features
        // features : {},
        activity    : {type: 'sleep'},
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
    },

    // TODO predict nap duration
    // Try to predict optimal napping time:
    // TODO 1. 7 hours after cicardian phase 0
    // TODO 2. 7 hours after today waking time
    // 3. 7 hours after today predicted waking time
    nap (behaviors, context) {
      let prediction, start, end, now = new Date();
      // TODO update context to be yesterday
      this.sleeps.context = context;
      prediction = this.sleeps.predict();

      // TODO get todays waking time
      // _(behaviors)
      //   .filter({activity: {type: 'sleep'}})
      //   .filter((behavior) => behavior.completedAt > this.timeCap)


      start = ICAL.Time.fromJSDate(prediction.awakeAt);

      // Backward 1 day
      start.addDuration(ICAL.Duration.fromSeconds(-1 * 24 * 60 * 60));

      // Forward 7 hours
      // TODO forward to optimal cicardian phase timing
      start.addDuration(ICAL.Duration.fromSeconds(7 * 60 * 60));

      end   = start.clone();

      // TODO predict nap duration
      end.addDuration(ICAL.Duration.fromSeconds(30 * 60));

      behaviors.push(Activity({
        // TODO add this properties
        // areaId   : this.healthArea.provider.id,
        // TODO better way to generate a temporary id
        provider    : {id: (Math.random() * 10000).toFixed(), name: 'relisse'},
        // quality  : x,
        // TODO predict features
        // features : {},
        activity    : {type: 'nap'},
        name        : 'Nap',
        notes       : 'How about napping at this time today?',
        suggestion  : true,
        asleepAt    : start.toJSDate(),
        awakeAt     : end.toJSDate(),
        start       : start.toJSDate(),
        end         : end.toJSDate(),
        createdAt   : now,
        updatedAt   : now,
        completedAt : prediction.asleepAt
      }));

    }
  }
}));

'use strict';


Habit.add(stampit({
  init () {
    // TODO find better way to fetch trained classifiers
    this.predictor = Re.estimators.estimators[3].sleepiness.sleep || Classifier.get('sleep');
  },
  refs: {
    name: 'sleep'
  },
  methods: {
    // TODO predict people at moment
    habitualize (ocurrences, context) {
      let now = new Date(), prediction;
      this.predictor.context = context;
      prediction = this.predictor.predict();

      // TODO infer venue for the habit
      // TODO elaborate habitual ocurrences
      // for now just add todays one sleep habit ocurrence ;)
      ocurrences.push(Activity({
        // TODO add this properties
        // areaId   : this.healthArea.provider.id,
        // TODO better way to generate a temporary id
        provider    : {id: (Math.random() * 10000).toFixed(), name: 'relisse'},
        // quality  : x,
        // TODO predict features
        features    : {
          start     : prediction.asleepAt,
          duration: {
            estimated: (prediction.awakeAt - prediction.asleepAt) / 1000
          }
        },
        habituality : {},
        status      : 'open', // TODO predict status correctly
        activity    : {type: 'sleep'},
        name        : 'Sleep',
        notes       : 'Probably you slept this much today.',
        asleepAt    : prediction.asleepAt,
        awakeAt     : prediction.awakeAt,
        start       : prediction.asleepAt,
        end         : prediction.awakeAt,
        createdAt   : now,
        updatedAt   : now,
        completedAt : prediction.asleepAt
      }));

      return Promise.resolve(ocurrences);
    }
  }
}));

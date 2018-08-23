'use strict';


Habit.add(stampit({
  init () {
    // TODO find better way to fetch trained classifiers
    // TODO find better way to fetch trained estimators
    this.estimator = Re.estimators && Re.estimators.estimators[3] || Estimator.get('sleepiness');
    this.predictor = this.estimator.sleepiness.sleep || Classifier.get('sleep');
  },
  refs: {
    name: 'sleep'
  },
  methods: {
    // TODO predict people at moment
    habitualize (ocurrences, context) {
      let now = new Date(), prediction, activity;
      this.predictor.context = context;
      prediction = this.predictor.predict();

      // TODO infer venue for the habit
      // TODO elaborate habitual ocurrences
      // for now just add todays one sleep habit ocurrence ;)
      activity = Activity({
        // TODO add this properties
        // areaId   : this.healthArea.provider.id,
        // TODO better way to generate a temporary id
        provider    : {id: (Math.random() * 10000).toFixed(), name: 'relisse'},
        // quality  : x,
        // -> TODO guess habitual features
        features    : {
          start     : prediction.asleepAt,
          duration: {
            estimated: (prediction.awakeAt - prediction.asleepAt) / 1000
          }
        },
        habituality : {},
        // TODO auto-complete sleep habit when it's chance is more than 90%
        // for now, we leave the habit open to allow it to belong to the
        // prediction set. Think if it's wize to make habits belong to the prediction set,
        // since they are only missing data-points inferred
        status      : 'open',
        activity    : {type: 'sleep'},
        name        : 'Habitual Sleep',
        notes       : 'Probably you slept this much today.',
        asleepAt    : prediction.asleepAt,
        awakeAt     : prediction.awakeAt,
        start       : prediction.asleepAt,
        end         : prediction.awakeAt,
        createdAt   : now,
        updatedAt   : now,
        completedAt : prediction.asleepAt
      });

      // TODO formally guess all other features for habits
      // this is a pseudo-hack to guess sleepiness, but i need to guess all others
      return Promise.resolve()
        .then(() => this.estimator.contextualize([activity]) )
        .then((activity) => this.estimator.inferActualSleepiness(activity) )
        .then(() => {
          ocurrences.push(activity);
          return ocurrences;
        });
    },

    performate (ocurrences) {
      return this.estimator
        .estimate(ocurrences.map(Ocurrence.fromJSON, Ocurrence))
        .then(() => Context().for(moment().startOf('day').toDate()))
        .then((context) => this.habitualize(ocurrences, context))
        .then((ocurrences) => {
          return {graphs: [{ event: ocurrences[ocurrences.length - 1] }]}
        })
    }
  }
}));

/* globals Estimator, Classifier  */
/* exports Re */

'use strict';

var byChance = (a, b) => b.chance - a.chance

var Re = stampit({
  static: {
    DEFAULT_OCURRENCE_DURATION: 25 * 60, // A pomodoro

    // Estimates actual values:
    // - mainly for past ocurrences
    // - for future ocurrences just do some basic normalization
    estimate (ocurrences, areas) {
      // Reset all classifiers
      Classifier.stage();

      ocurrences = ocurrences.map(Ocurrence.fromJSON, Ocurrence);
      this.estimators = Estimators({ocurrences: ocurrences, areas: areas});

      return this.estimators.estimate();
    },

    // Train classifiers to classify ocurrences
    learn(ocurrences) {
      let learnable = this.learnableSet(ocurrences);

      this.chance = Classifier.chance;
      this.chance.learn(learnable).then(() => alert('learned'));

      return {amount: learnable.length};
    },

    // ! TODO Move lernable set to classifier and estimators base class
    learnableSet (ocurrences) {
      // Only learn from past ocurrences that actualy happened
      return ocurrences.filter((ocurrence) => ocurrence.status === 'complete');
    },

    // - Predict ocurrences most likely to happen
    predict(ocurrences, context) {
      let future = this.predictableSet(ocurrences);

      // Predict chance for future ocorrences
      this.chance.context = context;
      this.chance.predict(future);

      // Incorporate features in ocurrence to save prediction on database
      future.map((ocurrence) => ocurrence.incorporate());

      return future;
    },

    // Only try to predict future ocurrences (do not already have a prediction attached and it is not already done)
    predictableSet (ocurrences) {
      return ocurrences
      // Clone and instantiate dataset
      // TODO reverse this order, when data is reimported to avoid tons of useless instances
      .map(Ocurrence.fromJSON, Ocurrence)
      .filter((ocurrence) => ocurrence.status === 'open');

    },

    // TODO move to context
    _computeAvailableTime () {
        let oneDay = ICAL.Duration.fromSeconds(24 * 60 * 60), midnight = ICAL.Time.now(), available;

        midnight.hour  = midnight.minute = midnight.second = 0;
        midnight.addDuration(oneDay);
        available      = midnight.subtractDate(ICAL.Time.now()).toSeconds();

        return available;
    },

    // TODO externalize prediction, habitiation and suggestion methods
    lisse(ocurrences) {
      let range, midnight = ICAL.Time.now(), lisse,
        oneDay = ICAL.Duration.fromSeconds(24 * 60 * 60), next = midnight.clone();

      midnight.hour = midnight.minute = midnight.second = 0;
      next.addDuration(oneDay);
      range = [ midnight.toJSDate(), next.toJSDate() ];

      return this._predictedEventsFor(range, ocurrences)
        // Add already completed events from today at the beginning of time
        // TODO externalize past events for range
        .then((predicted) => {
          lisse = predicted.concat(this._pastEventsFromToday(range, ocurrences));
          return Promise.resolve(lisse);
        })
        .then(() => this._suggestedEventsFor(range, ocurrences))
        .then((suggestions) => {
          lisse = lisse.concat(suggestions);

          if (lisse.length > 50) {
            console.error("app: Your prediction probably failed and was handicapped to only 50 results.");
            lisse = lisse.splice(0, 50);
          }

          return lisse;
        });
    },

    // Predict most likely events for a time range
    _predictedEventsFor(range, ocurrences) {
      return new Promise((finished, rejected) => {
        let available = this._computeAvailableTime(range),
          start = ICAL.Time.fromJSDate(range[0]), travel, lisse = [];

        travel = () =>
          Context().for(start.toJSDate())
            .then((context) => {
              let message = ["Prediction"];
              message.push(" Context");
              message.push("  Now     : " + context.calendar.now);
              message.push("  Location: " + context.location.latitude + 'lat ' + context.location.longitude + 'lon');
              message.push(" Meta ");
              message.push("  Available Time: " + available + 's');
              console.log(message.join('\n'));
              return this.predict(ocurrences, context);
            })
            // TODO think of how to deal with most probably behavior for each context, between predictions
            //      do this to speed up prediction and fix up anticipationn
            .then((prediction) => Promise.resolve(
              prediction
                .sort(byChance)
                // Slice prediction by context for only 1 ocurrence
                .slice(0, 1)
                .map((ocurrence) => {
                  let seconds  = ocurrence.features.duration.estimated || this.DEFAULT_OCURRENCE_DURATION,
                      duration = ICAL.Duration.fromSeconds(seconds);

                  // FIXME predict current happening ocurrence within range
                  // WANRING! ocurrence.features.start must be defined by this method
                  // the unique case that it is not defined by this method is for the
                  // currently happening ocurrence, since range is usually midnight this
                  // ocurrence is sleep!
                  if (ocurrence.features.start) {start = ICAL.Time.fromJSDate(ocurrence.features.start);};

                  ocurrence.features.start = start.toJSDate();
                  start.addDuration(duration);
                  ocurrence.features.end   = start.toJSDate();



                  // TODO figure out better way of doing this, shouldn't the
                  // context change be enough prevent it?
                  // Prevent predicting the same ocurrence twice in the same day
                  // ocurrences.splice(ocurrences.indexOf(ocurrence), 1); // FIXME figure out why indexOf is not working!
                  let index = ocurrences.indexOf(ocurrences.find((o) => o.__firebaseKey__ === ocurrence.__firebaseKey__));
                  ocurrences.splice(index, 1);

                  available -= seconds;

                  console.log('Predicted ocurrence:', ocurrence.name, ocurrence.features.start, ocurrence.features.end);

                  return ocurrence;
                })
            ))
            .then((events) => {
              // Add probable events for time
              lisse = lisse.concat(events);

              // There is still time available on range, add more predictions
              if (available > 0 && lisse.length < 8) {
                travel();
              } else {
                finished(lisse);
              }
            })
            .catch(rejected);


        // Add habitual ocurrences to prediction set then travel through time range
        this._habitsFor(range, ocurrences).then(travel);
      });
    },

    _pastEventsFromToday(range, ocurrences) {
      let comparable = range[0]; // normaly range[0] === todays midnight
      return ocurrences.filter((o) => o.completedAt && o.completedAt > comparable );
    },

    _suggestedEventsFor (range, ocurrences) {
      // TODO respect range and context when suggesting
      return Context().for(range[0])
        .then((context) => {
          return Suggester({
            ocurrences: ocurrences,
            context   : context
          })
        })
        .then((ocurrences) => {
          let today = new Date().getDay();
          return ocurrences.filter((o) =>
            o.suggestion && o.start.getDay() === today
          );
        });
    },

    // - Adds habitual ocurrences to prediction set
    // TODO respect max frequency for habitual ocurrences (also ignore what happened!)
    // TODO externalize habits domain
    _habitsFor (range, ocurrences) {
      let prediction, yesterday = moment(range[0]).subtract(1, 'day'),
        now = new Date(), predictor = this.chance.motivation.sensation.sleep;

      console.log('predicting habits');
      return Context().for(yesterday.toDate())
        .then((context) => {
          predictor.context = context;
          prediction = predictor.predict();

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
            status      : 'open',
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
          }))
        });
    }
  }
});

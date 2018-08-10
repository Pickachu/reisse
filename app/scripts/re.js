/* globals Estimator, Classifier  */
/* exports Re */

'use strict';

var byChance = (a, b) => b.chance - a.chance

/**
 * Ré - The best day
 *
 * There are three main categories of ocurrences:
 *
 *
 * • Past:
 *
 * Sensor detected or user registered ocurrences of the past are just
 * inserted into the past time of the calendar
 *
 *
 * • Future:
 *
 * A prediction set is created based on user behavior, there are two sub-categories:
 *
 * - Habitual Ocurrences: Unregistered by the user but nonetheless
 * high frequency (sleep, eat, etc) ocurrences are thought as habitual
 * ocurrences and added automatically to the prediction set, before
 * the prediction is made.
 *
 * - Predicted Ocurrences: Based on all Past and Habitual Ocurrences a prediction set
 * will be created for the given context. Ocurrences inside of a prediction set bound
 * to a context are in this category.
 *
 *
 * • Suggestions: A optimization is made from the prediction set in order to
 * generate the optimal human behavior. All ocurrences in this suggestion set
 * (also bound to the context of the original prediction set) are in this category.
 *
 * @type {stamp}
 */
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

    // TODO Move lernableSet to classifier and estimators base class
    learnableSet (ocurrences) {
      // Only learn from past ocurrences that actualy happened
      return ocurrences.filter((ocurrence) => ocurrence.status === 'complete');
    },


    /**
     * Predict ocurrences most likely to happen at a given context
     * • The given prediction set will be filtered by executable ocurrences only
     * this ocurrences can be on the past, present or future
     * • A main property of context is the calendar.now timestamp, all ocurrences
     * are thought of happening at this time
     *
     * @param  {Ocurrence[]} ocurrences [description]
     * @param  {Context} context    [description]
     *
     * @return {Ocurrence[]}   the predicted ocurrences sorted by probability of ocurrence
     * beign executed on the given contex
     */
    predict(ocurrences, context) {
      let set = this.predictableSet(ocurrences);

      this.chance.context = context;

      // Predict chance for ocorrence set
      return this.chance
        .predict(set)
        // Incorporate features in ocurrence to save prediction on database
        .then( () => set.forEach((ocurrence) => ocurrence.incorporate()) )
        // Return prediction set
        .then( () => set );
    },

    // Only try to predict unexecuted ocurrences (status !== completed)
    // TODO filter already predicted ocurrences
    predictableSet (ocurrences) {
      return ocurrences
      // Clone and instantiate dataset
      // TODO reverse this order, when data is reimported to avoid tons of useless instances
      .map(Ocurrence.fromJSON, Ocurrence)
      .filter((ocurrence) => ocurrence.status === 'open');

    },

    // TODO move to context
    // TODO compute available time from past, and from already defined events
    // For now, give 2 days of available time, later get available time from timerange param
    _computeAvailableTime (range) {
      let oneDay = ICAL.Duration.fromSeconds(2 * 24 * 60 * 60), midnight = ICAL.Time.now(), available;

      midnight.hour  = midnight.minute = midnight.second = 0;
      midnight.addDuration(oneDay);
      available      = midnight.subtractDate(ICAL.Time.now()).toSeconds();

      return available;
    },

    // lissë (calendarize)
    // Given a set of ocurrences build a one day calendar for the best possible day
    // TODO externalize prediction, habituation and suggestion methods
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
              message.push("  Location: " + context.location.latitude + ' lat ' + context.location.longitude + ' lon');
              message.push("  People  : " + _(context.people).map('profile.names.0').compact().value());
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
                //  TODO use a smarter filter for only more likely to happen suggestions
                .slice(0, 1)
                .map((ocurrence) => {
                  let seconds  = ocurrence.features.duration.estimated || this.DEFAULT_OCURRENCE_DURATION,
                      duration = ICAL.Duration.fromSeconds(seconds);

                  // FIXME predict current happening ocurrence within range
                  // WARNING! ocurrence.features.start must be defined by this method
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
                  // ocurrences.splice(ocurrences.indexOf(ocurrence), 1);
                  // FIXME figure out why indexOf is not working!
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
              if (available > 0 && lisse.length < 15) {
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

    // FIXME respect range and context when suggesting
    // TODO estimate future contexts and forward to habituators
    _suggestedEventsFor (range, ocurrences) {
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
    // • This are basically ocurrences that usually happen but are missing in the data
    // (either because user does not registered it yet or will never register)
    // on the stated range.
    // TODO respect max frequency for habitual ocurrences (also ignore what happened!)
    // TODO estimate past contexts and forward to habituators
    _habitsFor (range, ocurrences) {
      let yesterday = moment(range[0]).subtract(1, 'day');

      console.log('predicting habits');
      return Context().for(yesterday.toDate())
        .then((context) =>
          // TODO pass areas
          Habit().for(ocurrences, context)
        );

    }
  }
});

/* globals Estimator, Classifier  */
/* exports Re.Encoder */

'use strict';

Re.Encoder = stampit({
  static: {
    DEFAULT_OCURRENCE_DURATION: 25 * 60, // A pomodoro
    predictions: [],

    // lissë (calendarize)
    // Given a set of ocurrences build a one day calendar for the best possible day
    // TODO externalize prediction, habituation and suggestion methods
    lisse(ocurrences) {
      let lisse, range;

      this.predictions = [];

      // For now, compute timslice returns only the current day range
      // TODO make it compute teh current viewing range for the user on calendar
      range = this._computeTimeslice();

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
      let lisse = [];

      // Traveler generates a context for each time step inside the given time
      // range and also is responsible for allowing the time step resizing
      const traveler = this._computeTimeTraveler(range);

      return this.
        // FIXME make habituators return only habits, and then merge habits
        // with the final predictable ocurrence set to feed it to the prediction
        // engine. Instead of just mutating the ocurrences array.
        // _habitualEventsFor(range, ocurrences).then((habitualOcurrences) =>
        _habitualEventsFor(range, ocurrences)
        .then(() =>
          traveler.reduce((events, context, traveler) =>
            this
              .predict(ocurrences, context)

              .then((prediction) => {this.predictions.push(prediction); return prediction;})

              // TODO think of how to deal with most probably behavior for each context,
              // between predictions do this to speed up prediction and fix up anticipationn
              .then((prediction) => this.__encodePredictionSet(prediction, traveler))



              // Prevent predicting the same ocurrence twice in the same day
              // TODO figure out better way of doing this prevention, shouldn't
              // the context change be enough prevent it?
              .then((encoded) => {
                encoded.forEach((ocurrence) => {
                  // FIXME figure out why just using indexOf is not working, (probably
                  // ocurrences are being cloned somewhere)
                  let target = _.find(ocurrences, ['__firebaseKey__', ocurrence.__firebaseKey__]);
                  target || (target = _.find(ocurrences, {provider: {name: 'relisse', id: _.get(ocurrence, 'provider.id')}}));

                  if (target) {
                    // Remove encodeed ocurrence from prediction set, since it was
                    // accepted as a predicition candidate
                    ocurrences.splice(ocurrences.indexOf(target), 1);
                  } else {
                    console.error(`Re.encoder: Ocurrence not found for deduplication ${ocurrence.name || ocurrence.toJSON()}`);
                  }
                });
                return encoded;
              })

              .then((encoded) => {
                let seconds = encoded[0].features.duration.estimated || this.DEFAULT_OCURRENCE_DURATION;

                // By fowarding all available time we stop predicting when it acquires 15 events
                if (events.length > 15) {
                  traveler.forward(traveler.available);
                // By default gets the next context
                } else {
                  traveler.forward(seconds);
                }

                return events.concat(encoded[0]);
              })
          , [])
        );
    },

    /**
     * Receives a prediction set for a given context, selects ocurrences that will
     * be displayed and positions ocurrence in the current calendar encoding process
     *
     * @param  {[type]} predictions [description]
     * @param  {[type]} start [description]
     *
     * @return {[type]}             [description]
     */
    __encodePredictionSet(prediction, traveler) {
      return prediction
        .sort(function byChance (a, b) {
          return b.chance - a.chance;
        })
        // Slice prediction by context for only 1 ocurrence
        // TODO use a smarter filter for only more likely to happen suggestions
        .slice(0, 1)
        .map((ocurrence) => {
          let duration  = ocurrence.features.duration.estimated || this.DEFAULT_OCURRENCE_DURATION,
          start = traveler.cursor;

          // FIXME predict current happening ocurrence within range
          // WARNING! ocurrence.features.start must be defined by this method
          // the unique case that it is not defined by this method is for the
          // currently happening ocurrence, since range is usually midnight this
          // ocurrence is sleep!
          if (ocurrence.features.start) {
            if (ocurrence.activity && ocurrence.activity.type !== 'sleep') {
              console.warn('Re.encoder: reseting traver cursor time to non sleep ocurrence');
            }
            start = traveler.cursor = moment(ocurrence.features.start);
          }

          ocurrence.features.start = start.toDate();
          ocurrence.features.end   = start.clone().add(duration, 'seconds').toDate();

          console.log('Predicted ocurrence:', ocurrence.name, ocurrence.features.start, ocurrence.features.end);

          return ocurrence;
        })

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
    // TODO make habituators calculate some nice range near the context (eg: sleep habituators
    // check for todays and last days nights of sleep)
    _habitualEventsFor (range, ocurrences) {
      let yesterday = moment(range[0]).subtract(1, 'day');

      console.log('predicting habits');
      return Context().for(yesterday.toDate())
        .then((context) =>
          // TODO pass areas
          Habit().for(ocurrences, context)
        );

    },
  }
});

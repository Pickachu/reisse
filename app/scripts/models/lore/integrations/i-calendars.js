
Lore.integrations.push(
  Lore.Integration({
    name: 'i-calendars',

    minimunSince: new Date(Date.parse('2006-04-13')),

    // Id on provider for this calendar
    calendarId: 'heitorsalazar@gmail.com',

    // Array of events that are in fact representing a duration of another ocurrence
    // instead of being a ocurrence itself
    durationEventIds: [],

    populate (lore) {
      console.log('service', this.name);
      this.populable = lore;

      // Add duration to tasks on this importation from events
      return this._populateDurations()
        // Import events igoring the ones consumed by populate Durations
        .then(this._populateEvents.bind(this));
    },
    _populateDurations () {
      let untimed, finished;

      // TODO compare current imported task with old task and update its duration!
      // for now, new tasks will keep its first import duration!

      let infer = () => {
        let ocurrence = untimed.shift();

        // No more ocurrences to process, resolve main promise
        if (!ocurrence) {
          console.info('Lore.integrations[i-calendars]: populated durations on all matching tasks');
          return finished();
        }

        if (untimed.length % 100 === 0) {
          console.info('Lore.integrations[i-calendars]:', untimed.length, 'remaining.');
        }

        // Actual duration already defined, does not need to infer
        // TODO infer actual duration when sincronized dates are missing
        if (ocurrence.features.duration.actual) return infer();

        this._timeFromCalendarEvents(ocurrence).then(infer);
      };

      return Promise.all([this.when('asana'), this.when('things')]).then((servings) =>
        new Promise((resolve, reject) => {
          finished = resolve;
          untimed  = _.flatten(servings);

          console.info('Lore.integrations[i-calendars]: populating durations for', untimed.length, 'tasks.');

          infer();
        })
      );
    },
    _populateEvents () {
      let providers = document.querySelectorAll('event-cursor'),
        cursor = _.filter(providers, {calendarId: this.calendarId})[0];

      cursor.timeMinimum = this.since;
      cursor.timeMaximum = this.until;

      return cursor.values().then(() => {
        let ocurrences = cursor.events
          .filter((event) => this.durationEventIds.indexOf(event.id))

          // Add calendar id to downloaded events
          .map((event)    => (event.calendarId = this.calendarId) && event)

          .map(Ocurrence.fromICalendar, Ocurrence)

          // Add area to downloaded events
          .map(this.populable.assignArea, this.populable);

        // Add imported events to ocurrences
        this.populable.ocurrences = this.populable.ocurrences.concat(ocurrences);
      });
    },
    _timeFromCalendarEvents (ocurrence) {
      return new Promise((resolve, reject) => {
        let provider = document.querySelectorAll('calendar-search')[0];

        // TODO multi calendar event searching
        (!provider.calendarId) && (provider.calendarId = "bdfjr3i3ebdjcmrn3rc35ptgj0@group.calendar.google.com");

        if (!ocurrence.name) return resolve(ocurrence);

        // Only search for events created after and before ocurrence completion
        provider.timeMinimum = ocurrence.createdAt;
        if (ocurrence.completedAt) provider.timeMaximum = ocurrence.completedAt;
        // TODO descover a pertinent maximun time when no maximun time is available
        else provider.timeMaximum = null;

        provider.query = ocurrence.name;

        // TODO partial time sincronization
        // provider.updatedSince = this.synchronizedAt;

        let succeeded = (response) => {
          let items = response.result.items,
          name = ocurrence.name.toLowerCase().transliterate(),
          duration = ocurrence.features.duration.actual || 0;

          items.forEach((item) => {
            let summary = item.summary.toLowerCase().transliterate();

            // Accept direct matches
            if (summary.indexOf(name) >= 0) {
              duration += this._durationFromCalendarItem(item);
              this.durationEventIds.push(item.id);
            }
          });

          // Do not set duration to 0.
          if (duration) ocurrence.features.duration.actual = duration;

          // TODO sperate duration and start concerns
          // The supreme start definer of an ocurrence is the first calendar
          // event for it, so there is no problem overriding here if found
          items.length && (ocurrence.start = this._minimunStartTimeFromCalendarItems(items));

          resolve(ocurrence);

        }, failed = (response) => {
          let error = response.result.error;
          let message = 'Lore.integrations[i-calendars]: Error while searching for calendar event.';
          message    += `\nCalendar Event: ${ocurrence}`
          message    += `\n code: ${error.code}\n message: ${error.message}`;

          switch (error.code) {
            case -1:
              message += '\n Will retry indefinately. Starting now.'
              console.warn(message);
              provider.search(provider.params).then(succeeded, failed);
              break;
            case 503:
              message += '\n Server is overloaded! Giving 1000ms for it to breath.'
              message += '\n Will retry indefinately. Starting now.'
              console.warn(message);
              setTimeout(() => {
                provider.search(provider.params).then(succeeded, failed);
              }, 1000);
              break;
            default:
              reject({
                ocurrence: ocurrence,
                error: error
              });
              break;
          }
        };

        provider.search(provider.params).then(succeeded, failed);
      });
    },
    _durationFromCalendarItem (item) {
      let start = Date.parse(item.start.dateTime),
        end     = Date.parse(item.end.dateTime  );

      return (end - start) / 1000;
    },
    _minimunStartTimeFromCalendarItems (items) {
      return items.map((item) => Date.parse(item.start.dateTime)).sort().shift()
    }
  })
);

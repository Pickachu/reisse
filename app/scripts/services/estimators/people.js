'use strict';

Estimator.add(stampit({
  refs: {
    name: 'people',
  },

  init() {
    this.provider = document.querySelector('foursquare-checkins');
  },

  methods: {
    estimate(ocurrences) {
      this.limit = 200;
      return this.when('location').then(this.inferActualPeople.bind(this));
    },

    // TODO sort by start and end times
    // TODO limit time of inferrement to 12 hours
    getUncrowed(occurrences) {
      return _(occurrences)
        // FIXME prevent start dates from coming invalid! (by using mobx, probably)
        .filter(({start}) => start ? start.toString() !== 'Invalid Date' : true)
        .tap((filtered) => {
          const difference = occurrences.length - filtered.length;
          if (difference !== 0) {
            console.warn(`estimators.people: getUncrowed: skipded ${difference} occurences with invalid start date. (reimport to fix)`);
          }
        })
        .sortBy('start')
        .value();
    },

    // TODO query facebook checkins
    // TODO query facebook posts with people
    inferActualPeople (ocurrences) {
      return new Promise((resolve, reject) => {
        let uncrowded = this.getUncrowed(ocurrences),
          visit = {venue: {id: null}},
          ocurrence = Ocurrence({
            start: new Date(0), end: new Date(0), provider: {},
            context: {venue: {id: undefined}}
          }),
          context = ocurrence.context,
          // Main time cursor used to track witch point in time we are to use as
          // reference for ocurrences, checkins, and visits.
          cursor = new Date(0); // TODO start date at foursquare creation

        // 1. Get checkin with people that happened at `some time`
        // 2. While time is less then next checkin with people
        //  - Get first ocurrence that has the `some time` between its start and end
        //    - If none is found, for now ignore. TODO consider checkins outside ocurrences, pehaps creating a new one?
        //  - Set current location as ocurrence venue
        //  - Set ocurrence people as checkin people
        //  - Get next ocurrence that is on the same venue and starts before `some time`
        //  - Set time to ocurrence start time
        // 3. Go to next checkin

        // TODO make this code more readable
        let next = () => {
          this._fetchCheckinsWithPeople(cursor)
            .then((checkins) => {
              checkins.forEach((checkin) => {
                let createdAt = checkin.createdAt * 1000,
                  // TODO query in relisse people database for foursquare friends
                  // TODO parse checkin.entities attribute (it comes with facebook people)
                  people = checkin.with.map(Person.fromFoursquare, Person).reduce((a, p) => ((a[p.provider.id] = p), a), {inferred: true});

                while (cursor < createdAt) {

                  if (inferrablePeople(visit, createdAt)) { context.people = visit.people; };

                  ocurrence = uncrowded.shift(), context = ocurrence.context;
                  visit     = this._createVisit(context.venue, ocurrence, people);
                  cursor    = visit.start;
                }
              });

              if (checkins.length) {
                next();
              } else {
                // TODO go to most recent ocurrence and set its people
                // if (ocurrence.status === 'open') {
                //   context.people = this.currentPeople = visit.people;
                //   return resolve(ocurrences);
                // }
                this.currentPeople = visit.people;
                resolve(ocurrences);
              }

            // TODO improve foursquare elements error api
          }, ({detail: {request}}) => {
              const meta = request.xhr.response.meta;
              let message;

              switch (meta.errorType) {
                case 'rate_limit':
                  message = 'estimators.people: foursquare is currently rate limited,';
                  message += 'people predictions are beign ignored until rate limit fades.';
                  message += `\nreceived: code '${meta.code}', details: ${meta.errorDetail} `;
                  console.warn(message);
                  resolve(ocurrences);
                  break;
                case 'quota_exceeded':
                  message = 'estimators.people: foursquare is currently out of quota ';
                  message += 'some people predictions were made. the remaining will be finished';
                  message += 'once quota is restored.';
                  message += `\nreceived: code '${meta.code}' with details: ${meta.errorDetail} `;
                  console.warn(message);
                  resolve(ocurrences);
                  break;
                default:
                  reject(error);
                  break;
              }
            });
        };

        // Check if it is possible to deduce people from this visit and people
        // - If checkin happend inside the visit user is certainly with checkins people
        // - If visit starts after the last checkin and current user location has not changed user is with friends
        //   - TODO unless some of the friends checks in another place
        let inferrablePeople = (visit, checkin) => {
          // Find that the checkin happend inside ocurrence time frame
          if (visit.start < checkin && checkin < visit.end) {
            return true;
          }

          // Many ocurrences happened in the same venue so people are the same between ocurrences
          // TODO figure out why context is coming without venue sometimes
          if (visit.start > checkin && context.venue && visit.venue.id === context.venue.id) {
            return true;
          }

          return false;
        };
        next();
      });
    },
    // Infer where user is visiting right now
    // definition of start of visit:
    // 1 TODO Idealy the start of the visit is when the user change locations
    // 2 Guess that were a location change sometime between location changes of ocurrences
    //
    // definition of end of visit:
    // 1 Idealy the end of the visit is the start of the next visit
    // 2 Guess that were no location change between the start and the end of the reference ocurrence
    // 3 Guess that were no location change between some time around the start of ocurrence when there is no end time
    //
    // Visit exists to:
    // - store inferred user venue and people
    // - add tolerance on start and end times of ocurrences
    _createVisit (venue, frame, people) {
      // let start = lastVisit.end || ocurrence.start, // TODO ocurrence.features.start.actual
      //   end = ocurrence.end || ocurrence.start; // TODO ocurrence.features.end.actual

      let start = moment(frame.start).subtract(20, 'minutes').toDate(),
          end   = moment(frame.end).add(      20, 'minutes').toDate();

      return {
        venue : venue,
        start : start,
        end   : end,
        people: people
      };
    },
    // TODO move this to an element?
    // this method fetches tha last 250 checkings that have people tagged in it
    // starting at the since date
    _fetchCheckinsWithPeople(since) {
      if (this.limit < 0) return Promise.resolve([]);
      if (!since) return Promise.resolve([]);

      return new Promise((resolve, reject) => {
        let query = {
          afterTimestamp: since,
          sort: 'oldestfirst',
          limit: 250
        };

        this._fetchCheckins(query)
          .then((checkins) => {
            let crowded = checkins.filter(this.__checkinHasPeople);
            if (crowded.length) {
              resolve(crowded);
            } else {
              let last = checkins.pop();
              if (last) {
                this._fetchCheckinsWithPeople(new Date(last.createdAt * 1000 + 1000)).then(resolve, reject);
              } else {
                resolve([]);
              }
            }
          }, reject);
      });
    },

    __checkinHasPeople(checkin) {
      if (checkin.with) return true;
      // TODO accept other entities as user
      if (checkin.entities) {
        console.warn(`estimators.people: ignoring checkin with entities (possible with people): ${checkin.id}`);
        // return checkin.entities.some(({type}) => type === 'facebookUser' )
      }

      return false;
    },

    // method not used yet
    _fetchOldestCheckin() {
      return this._fetchCheckins({
        sort: 'oldestfirst',
        limit: 1
      }).then((checkins) => Promise.resolve(checkins[0]));
    },

    _fetchCheckins(query) {
      return new Promise((resolve, reject) => {
        let provider = this.provider,
          listener = function () {
            this.removeEventListener('populated', listener);
            this.removeEventListener('error', reject);
            resolve(this.checkins);
          };

        provider.addEventListener('populated', listener);
        provider.addEventListener('error', reject);

        if (query) {
          // provider.beforeTimestamp = query.beforeTimestamp;
          provider.afterTimestamp  = query.afterTimestamp;
          provider.limit           = query.limit;
          provider.sort            = query.sort;
        }

        provider.fetch();
      });
    }
  }
}));

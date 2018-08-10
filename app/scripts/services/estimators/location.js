'use strict';

// TODO create start duration, and end estimators
// TODO async estimator support
Estimator.add(stampit({
  init() {
    this.provider = document.querySelector('foursquare-venues');
    this.boundStoreCertainValues = this.storeCertainValues.bind(this);
    this._boundInferLocations    = this._inferLocations.bind(this);
  },
  refs: {
    name: 'location',
    locations: new Map()
  },
  methods: {
    estimate (ocurrences) {
      this.limit = 200;
      return this.inferActualLocation(ocurrences).then(this.boundStoreCertainValues);
    },

    inferActualLocation (ocurrences) {
      return this.populateLocations(ocurrences).then(this._boundInferLocations);
    },

    populateLocations (ocurrences) {
      return new Promise((resolve, reject) => {
        let contexts = _.map(ocurrences, 'context'),
        fetched = (searchs) => {
          searchs.forEach((venues, index) => {
            if (!venues.length) return;

            let context = contexts[index];
            context.venue || (context.venue = {});
            context.venue.name = venues[0].name;
            context.venue.id   = venues[0].id;
          });

          resolve(ocurrences);
        };

        // TODO sort by execution time
        this._fetchLocations(contexts)
          .then(fetched, this._fetchLocationsFailer({resolve: fetched, reject: reject}));

      })
    },

    // TODO move to location fetcher element
    storeCertainValues(estimated) {
      let ocurrences = app.ocurrences, updates = {};

      _(estimated)
        .filter((e) => e.context.venue && e.context.venue.inferred === undefined)
        .map((estimated) => {
          let index = ocurrences.findIndex((ocurrence) => ocurrence.__firebaseKey__ === estimated.__firebaseKey__);

          if (index < 0) { return false; }

          // For now ignore updates
          updates[`ocurrences/${estimated.__firebaseKey__}/context/venue`] = estimated.context.venue;

          return estimated;
        })
        // TODO allow estimators to save data by moving them to elements
        .tap((estimateds) => {
          let query = new Firebase("https://boiling-fire-6466.firebaseio.com/lore");
          query.update(updates);
          return estimateds;
        }).tap((estimateds) => {
          // console.log('skiped certain storage', updates);

          let failures = _.compact(estimateds).length - estimateds.length,
            successes = estimateds.length - failures;

          if (failures) {
            console.error(`estimators.${this.name}: failed storing certain values for`, failures, 'ocurrences.');
          }

          if (successes) {
            let names = _(estimated).map('context.venue.name').uniq().value();
            console.info(`estimators.${this.name}: stored certain venues for`, successes, 'ocurrences. Samples: ', names);
          }
        })
        .value();

      return estimated;
    },

    _fetchLocations (items) {

      items = items.concat([]);

      return new Promise((resolve, reject) => {
        let locations = [],
        next = (venues) => {
          locations.push(venues);

          if (items.length) {
            this._fetchLocation(items.shift()).then(next, fail);
          } else {
            resolve(locations);
          }
        },
        fail = (reason) => {
          reject({message: 'rate_limit', locations: locations, originalReason: reason})
        };

        next();
        locations.shift();
      });
    },
    _fetchLocation (item) {
      return new Promise((resolve, reject) => {
          if (this.limit < 0) {return resolve([]);}

          let listener = function () {
            this.removeEventListener('populated', listener);
            resolve(this.venues);
          }, venue = item.venue;

          if (venue && !venue.name) {
            let provider = this.provider;
            this.limit--;

            if (provider.latitude != venue.latitude || provider.longitude != venue.longitude){
              provider.addEventListener('populated', listener);
              provider.addEventListener('error', reject);
              provider.latitude  = venue.latitude;
              provider.longitude = venue.longitude;
            } else {
              resolve(provider.venues);
            }
          } else {
              resolve([]);
          }
      });
    },
    _inferLocations (ocurrences) {
      let venue, located, currentVenue;

      // TODO sort by start and end times
      // TODO limit time of inferrement to 12 hours
      located = _(ocurrences)
        .sortBy('completedAt')
        .each((ocurrence) => {
          if (ocurrence.context.venue) {
            venue = ocurrence.context.venue;
          } else {
            if (ocurrence.completedAt) {
              ocurrence.context.venue = Object.assign({inferred: true}, venue);
            } else {
              // TODO predict next location
              currentVenue || (currentVenue = venue);
            }
          }
        });

      this.currentVenue = currentVenue;
      return located;
    },
    _fetchLocationsFailer (estimation) {
      return (reason) => {
        if (reason.locations.length) estimation.resolve(reason.locations);
        else estimation.reject(reason);
      }
    }
  }
}));

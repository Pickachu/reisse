'use strict';

// TODO create start duration, and end estimators
// TODO async estimator support
estimators.location = stampit({
  init() {
    this.provider = document.querySelector('foursquare-venues');
    this.boundStoreCertainValues = this.storeCertainValues.bind(this);
    this._boundInferLocations    = this._inferLocations.bind(this);
  },
  refs: {
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
      let ocurrences = app.ocurrences;

      _(estimated)
        .filter((e) => e.context.venue && e.context.venue.inferred === undefined)
        .each((estimated) => {
          let index = ocurrences.findIndex((ocurrence) => ocurrence.__firebaseKey__ === estimated.__firebaseKey__);
          if (index < 0) {
            return console.error(`estimators.${this.name}: failed storing certain value for`, estimated);
          }
          // TODO compute changes
          app.set(['ocurrences', index, 'context', 'venue'], estimated.context.venue);
        });

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
        fail = () => {
          reject({message: 'rate_limit', locations: locations})
        };

        next();
        locations.shift();
      });
    },
    _fetchLocation (item) {
      return new Promise((resolve, reject) => {
          let listener = function () {
            this.removeEventListener('populated', listener);
            resolve(this.venues);
          }, venue = item.venue;

          if (this.limit < 0) {return resolve([]);}

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
});

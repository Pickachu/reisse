'use strict';

// TODO create start duration, and end estimators
// TODO async estimator support
estimators.location = stampit({
  init() {
    this.provider = document.querySelector('foursquare-venues');
    this.boundStoreCertainValues = this.storeCertainValues.bind(this);
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
      return new Promise((resolve, reject) => {
        // TODO sort by execution time
        this._fetchLocations(ocurrences).then((searchs) => {
          searchs.forEach((venues, index) => {
            if (!venues.length) return;

            let ocurrence = ocurrences[index];
            ocurrence.venue || (ocurrence.venue = {});
            ocurrence.venue.name = venues[0].name;
          });

          resolve(ocurrences);
        }, this._fetchLocationsFailer({resolve: resolve, reject: reject}));
      }).then(this._inferLocations);
    },

    // TODO move to location fetcher element
    storeCertainValues(estimated) {
        let ocurrences = app.ocurrences;

        return _(estimated)
          .filter((e) => e.venue.inferred === undefined)
          .each((estimated) => {
            let index = ocurrences.findIndex((ocurrence) => ocurrence.__firebaseKey__ === estimated.__firebaseKey__);
            if (index < 0) {
              return console.error(`estimators.${this.name}: failed storing certain value for`, estimated);
            }
            // TODO compute changes
            app.set(['ocurrences', index, 'venue'], estimated.venue);
          }).value();
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
            let provder = this.provider;
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
      let venue = null;

      // TODO sort by start and end times
      // TODO limit time of inferrement to 3 days
      return _(ocurrences)
        .sortBy('completedAt')
        .each((ocurrence) => {
          if (ocurrence.venue) {
            venue = ocurrence.venue;
          } else {
            ocurrence.venue = Object.assign({inferred: true}, venue);
          }
        }).value();
    },
    _fetchLocationsFailer (estimation) {
      return (reason) => {
        if (reason.locations.length) estimation.resolve(reason.locations);
        else estimation.reject(reason);
      }
    }
  }
});

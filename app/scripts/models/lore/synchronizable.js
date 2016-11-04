'use strict';

window.Lore || (window.Lore = stampit())

Lore = Lore.static({
  synchronizable: stampit({
    init () {
      if (this.synchronizedAt === undefined) {
        let query = new Firebase(this.location);
        query.child('synchronizedAt').once('value', (snapshot) => this.synchronizedAt = new Date(snapshot.val() || 0));
      } else {
        this.synchronizedAt = new Date(this.synchronizedAt || 0);
      }

      this.integrable = Lore.integrable();
    },
    static: {
      location: 'https://boiling-fire-6466.firebaseio.com/lore',
      synchronize () {
        console.log('lore.<synchronizable>: start synchronization');
        return this._createSyncTimeRanges()
          .then((ranges) => {
            return new Promise((synchronized) => {
              let next = () => {
                let range = ranges.shift();

                if (!range) return synchronized();

                this._synchronizeBatch(range[1]).then(next);
              };

              next();
            });
          });
      },

      _createSyncTimeRanges() {
        return new Firebase(this.location)
          .child('synchronizedAt')
          .once('value')
          .then((snapshot) => {
            let from   = new Date(snapshot.val()),
                to     = new Date(snapshot.val()),
                now    = Date.now(),
                ranges = [];

            // advance final date to 6 months in the future
            to.setMonth(to.getMonth() + 6);

            // keep time traveling and adding ranges until we hit a point after now
            while (to < now) {
              ranges.push([from.getTime(), to.getTime()]);

              // Advance 6 months on to and from dates
              to.setMonth(    to.getMonth() + 6);
              from.setMonth(from.getMonth() + 6);
            }

            ranges.push([to.getTime(), now]);

            return Promise.resolve(ranges);
          });
      },

      // TODO accept start at, to allow arbritary sync date ranges
      _synchronizeBatch (endAt) {
        console.log('lore.<synchronizable>: fetch version');
        return this._fetchVersion(endAt).then((current) => {
          this.synchronizingVersion = current;
          endAt = new Date(endAt);
          console.log('lore.<synchronizable>: fetched version from', current.synchronizedAt, 'to', endAt);
          return current.integrations(endAt).then((changes) => {
            let synchronizer = this.synchronizerable({
              changes: changes,
              location: current.location
            });

            console.log('lore.<synchronizable>: synchronize');
            return synchronizer.synchronize();
          });
        }, (reason) => {
          console.log('lore.<synchronizable>: synchronization failed', reason);
        });
      },

      // TODO use firebase promises
      _fetchVersion (limit) {
        let base         = new Firebase(this.location),
          synchronizedAt = base.child('synchronizedAt'),
          ocurrences     = base.child('ocurrences').orderByChild('updatedAt'),
          areas          = base.child('areas');

        return new Promise((resolve) => {
          synchronizedAt.once('value', (synchronizedAtSnapshot) => {
            ocurrences = ocurrences.startAt(synchronizedAtSnapshot.val()).endAt(limit || Date.now());

            ocurrences.once('value', (ocurrencesSnapshot) => {
              areas.once('value', (areasSnapshot) => {
                resolve(Lore.fromSnapshots({
                  areas: areasSnapshot,
                  ocurrences: ocurrencesSnapshot,
                  synchronizedAt: synchronizedAtSnapshot
                }));
              });
            });
          });
        });
      }
    },
    refs: {
      location: 'https://boiling-fire-6466.firebaseio.com/lore'
    },
    methods: {
      _computeFirebaseChanges(updates) {
        let batch = {}, changes, query = new Firebase('https://boiling-fire-6466.firebaseio.com/lore/ocurrences'),
        // TODO Move this function outside
        serialize = (change) => {
          if (change.value) {
            switch (change.value.constructor) {
              case Date:
                return change.value.getTime();
              case String:
              case Number:
              case Boolean:
                return change.value;
              case Array:
              case Object:
                let object = change.value;
                object.toJSON && (object = object.toJSON());
                return _.mapValues(object, (value) => (_.isDate(value) && value.getTime()) || value );
              default:
                throw new TypeError(`Lore._computeFirebaseChanges.<serialize> Unserializable type found ${change.value.constructor}!`);
            }
          } else {
            // undefined, null, false, 0, NaN
            return change.value;
          }
        };

        changes = this.changes(updates);

        changes.forEach((change) => {
          let value = serialize(change);

          switch(change.type) {
          case 'put':
            batch[change.key.join('/')] = value;
            break;

          case 'push':
            let id = query.push().key();
            batch[change.key.join('/') + '/' + id] = value;
            break;

          case 'del':
            batch[change.key.join('/')] = null;
            break;

          default:
            throw new TypeError("Unknown change type for computing firebase changes: " + change.type);
          }
        });

        return batch;
      }
    }
  })
});

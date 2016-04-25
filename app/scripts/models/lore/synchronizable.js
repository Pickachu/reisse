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
    },
    static: {
      synchronize () {
        console.log('lore.<synchronizable>: start synchronization');
        console.log('lore.<synchronizable>: fetch current version');
        this._fetchVersion((current) => {
          console.log('lore.<synchronizable>: fetched current version');
          current.integrations().then((changes) => {
            let synchronizer = this.synchronizerable({
              changes: changes,
              location: current.location
            });

            console.log('lore.<synchronizable>: last sync was at', current.synchronizedAt);
            synchronizer.synchronize();
          });
        });
      },

      _fetchVersion (callback) {
        let base         = new Firebase('https://boiling-fire-6466.firebaseio.com/lore'),
          synchronizedAt = base.child('synchronizedAt'),
          ocurrences     = base.child('ocurrences').orderByChild('createdAt'),
          areas          = base.child('areas');

        synchronizedAt.once('value', (synchronizedAtSnapshot) => {
          ocurrences = ocurrences.startAt(synchronizedAtSnapshot.val());

          ocurrences.once('value', (ocurrencesSnapshot) => {
            areas.once('value', (areasSnapshot) => {
              callback(Lore.fromSnapshots({
                areas: areasSnapshot,
                ocurrences: ocurrencesSnapshot,
                synchronizedAt: synchronizedAtSnapshot
              }));
            });
          });
        });
      }
    },
    refs: {
      location: 'https://boiling-fire-6466.firebaseio.com/lore'
    },
    methods: {
      // Distribute data into a consistent model
      integrations() {
        return new Promise((integrated, failed) => {
          let updates = Lore({synchronizedAt: this.synchronizedAt}), batch, servings = [], serve;

          if (!this.synchronizedAt) throw new TypeError("Lore.integrations: Cannot run integrations without last sync date.");

          Lore.integrations.forEach((integration) => {
            integration.since = this.synchronizedAt;
            servings.push(integration.populate(updates));
          });

          serve = Promise.all(servings);

          serve.then(() => {
            console.log('Lore.integrations: start changes computation.\n');

            batch = this._computeFirebaseChanges(updates);
            batch.synchronizedAt = Date.now();

            console.log('Lore.integrations: finished changes computation');
            integrated(batch);
          }, failed);
        });
      },
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
                throw new TypeError(`Lore._computeFirebaseChanges.<serialize> Unserializable type found ${change.value.constructor}!`)
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

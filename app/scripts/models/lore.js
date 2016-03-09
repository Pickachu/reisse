(function (global) {
  'use strict';

  let Service = stampit({
      methods: {
          populate () {throw new TypeError("Not implemented yet");}
      }
  });

  let services = [
      Service({
          name: 'things',
          populate (lore) {
              let provider = document.querySelector('things-element'),
                  ocurrences = provider.todos.map(Task.fromThings, Task);

              lore.areas      = provider.areas.map(Area.fromThings, Area);
              lore.ocurrences = lore.ocurrences.concat(ocurrences);
              // TODO: provider.projects.map(Project?.fromThings, Project);
              lore.workArea   = lore.areas.find((area) => area.provider.id == '9753CADC-C398-43C3-B822-5BD83795070D');
          }
      }),
      Service({
          name: 'asana',
          populate (lore) {
              let provider    = document.querySelector('asana-me'), ocurrences;
              ocurrences      = provider.tasks.map(Task.fromAsana, Task).map(lore.assignArea, lore);
              // TODO: provider.projects.map(Project?.fromThings, Project);

              lore.ocurrences = lore.ocurrences.concat(ocurrences);
          }
      }),
      Service({
          name: 'i-calendars',
          populate (lore) {
              let cursors = [].slice.call(document.querySelectorAll('event-cursor'), 0),
                  mapped  = cursors.map((cursor) => cursor.events),
                  reduced = mapped.reduce((total, events) => total.concat(events), []),
                  ocurrences;

              ocurrences      = reduced.map(Ocurrence.fromICalendar, Ocurrence).map(lore.assignArea, lore);
              lore.ocurrences = lore.ocurrences.concat(ocurrences);
          }
      })
  ];

  let synchronizerable   = stampit({
    methods: {
      synchronize () {
        this.changeCount = Object.keys(this.changes).length;
        this.split();
        this.process();
      },

      split () {
        let batch = {}, index = 0, maximum = this.maximum, key;

        if (this.changeCount) console.log(`synchronizer.split: ${this.changeCount} changes to synchronize.`);
        else return console.log('synchronizer.split: No changes to synchronize.');

        for (key in this.changes) {
          if (index >= maximum) {
            index = 0;
            this.batches.push(batch);
            batch = {};
          }

          batch[key] = this.changes[key];
          index++;
        }

        this.batches.push(batch);
      },
      process () {
        if (!this.batches.length) return console.log('synchronizer.process: Finished synchronizing.');

        // Send all batches one after another
        let current = this.batches.shift();
        this.send(current, () => this.process());
      },
      send (batch, sent) {
        this.query.update(batch, (error) => {
          if (error) throw new Error `lore: Error synchronizing. ${error.message}`
          sent();
        });
      }
    },
    init() {
      this.query = new Firebase(this.location);
    },
    props: {
      maximum: 500,
      status: 'pending',
      batches: []
    }
  });

  let synchronizable = stampit({
    init () {
      if (!this.synchronizedAt) {
        let query = new Firebase(this.location);
        query.child('synchronizedAt').once('value', (snapshot) => this.synchronizedAt = snapshot.val() || new Date(0));
      }
    },
    static: {
      synchronize () {
        console.log('lore.<synchronizable>: start synchronization');
        this._fetchCurrentVersion((current) => {
          let synchronizer = synchronizerable({
            changes: current.integrations(),
            location: current.location
          });

          console.log('lore.<synchronizable>: last sync was at', current.synchronizedAt);
          synchronizer.synchronize();
        });
      },

      _fetchCurrentVersion (callback) {
        let base = new Firebase('https://boiling-fire-6466.firebaseio.com/lore'),
          lastSync = base.child('synchronizedAt'),
          ocurrences = base.child('ocurrences').orderByChild('createdAt'),
          areas = base.child('areas');

        lastSync.once('value', (lastSyncSnapshot) => {
          ocurrences = ocurrences.startAt(lastSyncSnapshot.val());

          ocurrences.once('value', (ocurrencesSnapshot) => {
            areas.once('value', (areasSnapshot) => {
              callback(Lore({
                areas: areasSnapshot.val(),
                ocurrences: _.toArray(ocurrencesSnapshot.val()),
                synchronizedAt: lastSyncSnapshot.val() || new Date(0)
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
          var updates = Lore(), batch;

          if (!this.synchronizedAt) throw new TypeError("Lore.integrations: Cannot run integrations without last sync date.");

          services.forEach((service) => {
              service.populate(updates);
          });

          this._timeAwareFilter(this);
          this._timeAwareFilter(updates);

          batch = this._computeFirebaseChanges(updates);
          batch['synchronizedAt'] = Date.now();

          return batch;
      },
      _timeAwareFilter(updates) {
        let synchronizedAt = this.synchronizedAt, classify;

        classify = (entry) => {
          if (!entry.createdAt) console.warn("Invalid or no creation data found for entry, will ignore sync for: ", entry.name)
          return entry.createdAt > synchronizedAt;
        }

        updates.ocurrences = updates.ocurrences.filter(classify);
        updates.areas      = updates.areas.filter(classify);
      },
      _computeFirebaseChanges(updates) {
        let batch = {}, changes, query = new Firebase('https://boiling-fire-6466.firebaseio.com/lore/ocurrences'),
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
                if (change.value.toJSON) return change.value.toJSON()
                return change.value;
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
          change.value = serialize(change);

          switch(change.type) {
          case 'put':
              batch[change.key.join('/')] = change.value;
              break;

          case 'push':
              let id = query.push().key();
              batch[change.key.join('/') + '/' + id] = change.value;
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
  }),
  modelable = stampit({
      init () {
          this.areas      = this.areas.map(Area);
          this.ocurrences = this.ocurrences.map(Ocurrence.fromJSON, Ocurrence);
      },
      props: {
          areas: [],
          ocurrences: []
      },
      methods: {
          changes (attributes) {
              var changes = [];

              changes = changes.concat(this.arrayChanges('areas', attributes.areas));
              changes = changes.concat(this.arrayChanges('ocurrences', attributes.ocurrences));

              return this._normalizeChanges(changes);
          },
          assignArea(ocurrence) {
              switch (ocurrence.provider.name) {
              case 'asana':
                  ocurrence.area = _.pick(this.workArea, '_id', 'name');
                  break;
              case 'i-calendar':
                  break;
              default:
                  console.warn("Can\'t assign area to ", ocurrence);
              };

              return ocurrence;
          },
          toJSON() {
              return _.omit(this, 'workArea',  _.functions(this));
          }
      }
  });

  var Lore = global.Lore || {};
  global.Lore = Lore = differentiable.compose(synchronizable, modelable, Lore.deduplicator);
})(window)

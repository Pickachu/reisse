'use strict';

(() => {

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

    let synchronizable = stampit({
      static: {
        synchronize () {
          this._fetchCurrentVersion((current) => {
            let changes = current.integrations();
          });
        },
        _fetchCurrentVersion (callback) {
          let base = new Firebase('https://boiling-fire-6466.firebaseio.com/lore'),
            lastSync = base.child('synchronizedAt'),
            ocurrences = base.child('ocurrences').orderByChild('createdAt'),
            areas = base.child('areas');

          lastSync.on('value', (snapshot) => {
            ocurrences = ocurrences.startAt(snapshot.val());

            ocurrences.on('value', (ocurrencesSnapshot) => {
              areas.on('value', (areasSnapshot) => {
                callback(Lore({areas: areasSnapshot.val(), ocurrences: _.toArray(ocurrencesSnapshot.val())}))
              });
            });
          });
        }
      },
      refs: {
        location: 'https://boiling-fire-6466.firebaseio.com/lore'
      }
      methods: {
        // Distribute data into a consistent model
        integrations() {
            var updates = Lore(), batch;

            services.forEach((service) => {
                service.populate(updates);
            });

            this._timeAwareFilter(updates)

            batch = this._computeFirebaseChanges(updates);
            batch['lore/synchronizedAt'] = Date.now()

            return batch;
        },
        _timeAwareFilter(updates) {
          let synchronizedAt = this.synchronizedAt || new Date(0),

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
              if (change.value.toJSON) return change.value.toJSON();
              switch (change.value.constructor) {
                case Date:
                  return Date.getTime();
                case Number:
                case Boolean:
                case Object:
                  return change.value;
                default:
                  throw new TypeError(`Lore._computeFirebaseChanges.<serialize> Unserializable type found ${change.value.constructor}!`)
              }
              if (change.value.toJSON) {return change.value.toJSON()}
            }
          };

          changes = this.changes(updates);

          changes.forEach((change) => {
            serialize(change);

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

                return this._omitChanges(changes);
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

    let Lore;
    this.Lore = Lore = differentiable.compose(synchronizable, modelable);
})()

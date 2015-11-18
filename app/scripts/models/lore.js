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
                    tasks    = provider.areas.map((area) => area.tasks);

                lore.areas    = provider.areas.map(Area.fromThings, Area);
                lore.workArea = lore.areas.find((area) => area.provider.id == '9753CADC-C398-43C3-B822-5BD83795070D');
            }
        }),
        Service({
            name: 'asana',
            populate (lore) {
                let provider = document.querySelector('asana-me');
                provider.tasks.map(Task.fromAsana, Task).map(lore.assignArea, lore);
            }
        }),
        Service({
            name: 'i-calendars',
            populate (lore) {
                let cursors = [].slice.call(document.querySelectorAll('event-cursor'), 0),
                    mapped = cursors.map((cursor) => cursor.events),
                    reduced = mapped.reduce((total, events) => total.concat(events), []);

                reduced.map(Ocurrence.fromICalendar, Ocurrence).map(lore.assignArea, lore);
            }
        })
    ];

    let Lore = stampit({
        init () {
            this.areas || (this.areas = []);
            this.areas = this.areas.map(Area);
        },
        methods: {
            // Distribute data into a consistent model
            integrations() {
                var updates = Lore();
                services.forEach((service) => {
                    service.populate(updates);
                });

                return this.changes(updates);
            },
            changes (attributes) {
                var changes = [];

                attributes.areas.forEach((update) => {
                    var value     = this.areas.find((value) => value.provider.id == update.provider.id),
                        index     = this.areas.indexOf(value),
                        updateset;

                    if (value) {
                        updateset = this._prefixChanges(index, value.changes(update));
                        changes   = changes.concat(updateset);
                    } else {
                        changes.push({key: [], value: update, type: 'push'});
                    }
                }, this);

                this._prefixChanges('areas', changes);

                changes = changes.concat(this.arrayChanges('areas', attributes.areas));

                return changes;
            },
            assignArea(ocurrence) {
                switch (ocurrence.provider.name) {
                case 'asana':
                    ocurrence.area = _.pick(this.workArea, '_id', 'name');
                    this.workArea.tasks.push(ocurrence);
                    break;
                case 'i-calendar':
                    break;
                default:
                    console.warn("Can\'t assign area to ", ocurrence);
                };
            },
            toJSON() {
                return _.omit(this, 'workArea',  _.functions(this));
            }
        }
    });

    this.Lore = differentiable.compose(Lore);
})()

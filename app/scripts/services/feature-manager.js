'use strict';

var FeatureManager = function (app) {
    _.extend(app, {
        location: "https://boiling-fire-6466.firebaseio.com",
        _findOcurrences (feature, callback, finished) {
            let query = new Firebase(this.location + '/lore/ocurrences'), stop = _.debounce(() => {
                query.off('child_added', callback);
                query.off('child_added', stop);
                finished && finished.call(this);
            });

            query = query.orderByChild(`features/${feature}/relative`).startAt(0);

            query.on('child_added', callback);
            query.on('child_added', stop);

        },
        // todo _normalizeIndexes: () => {}
        _featureChanged (change) {
            return;

            let path    = change.path.split('.'),
                index   = path.indexOf('features'),

                ocurrence = this.get(path.slice(0, index)),

                // detect feature name
                feature = path[index + 1],

                // detect aggregable name
                aggregable  = path[index + 2],

                // get aggregable value
                current = +change.value;

            this.$.signaler.fire('iron-signal', {name: 'ocurrence-feature', data: {ocurrence: ocurrence, feature: feature, aggregable: aggregable, value: current}});

            // sort other features and send modifications to firebase
            this.async(() => {
                // TODO Check if there will be a gap in relative feature index and fill it

                // Move next feature one step up
                this._relativize(current, ocurrence, feature, aggregable);
            });

        },
        _relativize (key, relative, change, feature) {
            if (change != 1 && change != -1) throw new TypeError("app._relativize: changes can only be incremental");
            if (!Number.isFinite(relative) ) throw new TypeError("app._relativize: relative feature value can only by numerical");
            if (!key                       ) throw new TypeError(`app._relativize: invalid key provided to relativize ocurrence ${key}`);

            let relativizer = _.bind(this._relativizeFromSnapshot, this, relative, feature, change), update;

            update = () => {
                new Firebase(this.location + '/lore/ocurrences')
                  .update(this.updates, (error) => {if (error) console.log(error);});
            };

            this.updates = {};
            this._setRelativeFeature(key, feature, relative);

            this.index   = relative;
            this._findOcurrences(feature, relativizer, update);

            return true;
        },
        _relativizeFromSnapshot(original, name, change, snapshot) {
            let ocurrence = snapshot.val(), feature = ocurrence.features[name], relative = +feature.relative;
            if (!Number.isFinite(relative)) return;
            if (relative >= original) {
                this._setRelativeFeature(snapshot.key(), name, this.index + 1);
                this.index++
            }
        },
        _setRelativeFeature(key, feature, value) {
          this.updates[`${key}/features/${feature}/relative`] = value;
        }
    });
}

var Reisse = Reisse || {}
Reisse.FeatureManagerBehavior = {
    _relativize(key, value, change, feature) {
        app._relativize(key, value, change, feature);
    },
    _findOcurrenceByFeature (feature, aggregable, value) {
        let result;

        app.ocurrences.every((ocurrence) => {
            let other = ocurrence.features[feature][aggregable];
            if (!other) return true;

            if (value == other) {
                // let ocurrenceIndex = area.tasks.indexOf(ocurrence);

                // if (ocurrenceIndex < 0) throw new Error(`FeatureManager: could not find ocurrence with ${feature}.${aggregable} = ${value}`);

                result = ocurrence;

                // break loop
                return false;
            }

            return true;
        });

        if (!result) console.error(`FeatureManagerBehavior._findOcurrenceByFeature: could not find ocurrence with ${feature}.${aggregable} = ${value}`);

        return result;
    }
};

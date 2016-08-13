'use strict';

var aggregable = function (instance, property, feature, current, callback) {
    Object.defineProperty(instance, property, {
        enumerable: true,
        configurable: true,
        get () {return current;},
        set (value) {
            callback && callback.call(this, value, current);
            if (_.isNaN(value)) throw new TypeError("Feature.<aggregable>: Can't set feature value to NaN!");
            current = value;
            Feature.optimize(feature + '_' + property, current);
            return current;
        }
    });

    instance[property] = current;

}, Feature = stampit({
    init () {
        // Value relative to same feature in other behavior
        aggregable(this, 'relative' , this.name, this.relative);
        // Predicted (estimated) value for this feature (generally predicted by classifiers)
        aggregable(this, 'estimated', this.name, this.estimated, (value) => {this.truer = this.truer || value;});
        // Actual value for this feature (generally defined by the estimators)
        aggregable(this, 'actual'   , this.name, this.actual   , (value) => {this.truer = value;});
        // Value more close to the truth for this feature
        aggregable(this, 'truer'    , this.name, this.actual || this.estimated);

        // FIXME Clean feature to preserve the JSON structure accepted by firebase
        //       do cleaning on serialization!
        // _.forEach(this, (value, key) => {_.isUndefined(value) && delete this[key]})

        //Feature.store(this.name, this);
        Feature.summaries(this.name);
        Feature.increment(this.name);
    },
    methods: {
        toJSON () {
            // Return serialized version of only non undefined values
            return _.pick(_.omit(this, _.functions(this)), _.negate(_.isUndefined));
        }
    },
    static: {
        instances: {},
        aggregates: {maximums: {}, minimums: {}},
        counts: {},
        many (source) {
            let names = [].slice.call(arguments, 1, arguments.length), features = {};
            source.features || (source.features = {});

            names.forEach((name) => {
                let feature = source.features[name] || {name: name};
                feature.name || (feature.name = name);
                features[name]   = Feature(feature);
                // TODO
                // features.__proto__.incorporate = () => {source.incorporate.apply(source, arguments);};
            }, this);

            return features;
        },
        store (name, instance) {
            this.instances[name] = this.instances[name] || [];
            this.instances[name].push(instance);
        },
        summaries (name) {
            // Summaries are created once per feature name, so skip existent features
            if (Number.isFinite(this.counts[name])) return;

            let maximums = this.aggregates.maximums, minimums = this.aggregates.minimums;
            this.counts[name] = 0;

            ['relative', 'estimated', 'actual', 'truer'].forEach((property) => {
                maximums[name + '_' + property] = 0
                minimums[name + '_' + property] = 0
            });
        },
        increment (name) {
            this.counts[name]++;
        },
        optimize (name, value) {
            let maximums = this.aggregates.maximums, minimums = this.aggregates.minimums;
            if (maximums[name] < value) {maximums[name] = value;}
            if (minimums[name] > value) {minimums[name] = value;}
        },
        _findRelativeFeature (comparator, name) {
            return Feature.instances[name].find((feature, index) => {
                // Ignore features that does not have a numerical value
                if (!Number.isFinite(feature.relative)) return false;

                // Found other feature ?
                return comparator(feature);
            });
        }
    }
});

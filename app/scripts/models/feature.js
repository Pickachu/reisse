'use strict';

var aggregable = function (instance, property, feature, current, callback) {
    Object.defineProperty(instance, property, {
        enumerable: true,
        configurable: true,
        get () {return current;},
        set (value) {
            callback && callback.call(this, value, current);
            current = value;
            Feature.optimize(feature + '_' + property, current);
            return current;
        }
    });
}, Feature = stampit({
    init () {
        // Value relative to features of other elements
        aggregable(this, 'relative' , this.name, this.relative);
        // Estimated value by the neural network for this feature
        aggregable(this, 'estimated', this.name, this.estimated, (value) => {this.truer = this.truer || value;});
        // Actual value for this feature
        aggregable(this, 'actual'   , this.name, this.actual   , (value) => {this.truer = value;});
        // Value more close to the truth for this feature
        aggregable(this, 'truer'    , this.name, this.actual || this.estimated);

        // Clean feature to preserve the JSON structure accepted by firebase
        _.forEach(this, (value, key) => {_.isUndefined(value) && delete this[key]})

        Feature.store(this.name, this);
        Feature.increment(this.name);
    },
    methods: {
        promote () {
            let current = this.relative || 1, next = current + 1;
            var demoted;

            // TODO _findNextRelativeFeature()
            Feature.instances[this.name].forEach((feature, index) => {
                // Ignore features that does not have a numerical value
                if (!Number.isFinite(feature.relative)) return;

                // Do not count itself as a demotion option
                if (this == feature  ) return;

                // Found other feature to swap with
                if (feature.relative == next) {
                    demoted = feature;
                }
            }, this);

            demoted && (demoted.relative = current);
            this.relative    = next;

            return demoted;
        },
        demote () {},
        toJSON () {
            // Return serialized version of only non undefined values
            return _.pick(_.omit(this, _.functions(this)), _.negate(_.isUndefined));
        }
    },
    static: {
        instances: {},
        aggregates: {maximums: {}, minimums: {}},
        totals: {},
        many (source) {
            let names = [].slice.call(arguments, 1, arguments.length), features = {}, featured;
            source.features || (source.features = {});
            featured = () => source;

            names.map((name) => {
                let feature = source.features[name] || {name: name};
                feature.name || (feature.name = name);
                feature.featured = featured;
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
        increment (name) {
            this.totals[name] = (this.totals[name] = 0);
            this.totals[name]++;
        },
        optimize (name, value) {
            var maximums = this.aggregates.maximums, minimums = this.aggregates.minimums;
            if (maximums[name] < value) {maximums[name] = value;}
            if (minimums[name] > value) {minimums[name] = value;}
        }
    }
});

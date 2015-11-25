'use strict';

var Feature = stampit({
    init () {
        // Value relative to features of other elements
        aggregable(this, 'relative' , this.name, this.relative);
        // Estimated value for this feature on other elements
        aggregable(this, 'estimated', this.name, this.estimated);
        // Actual value for this feature
        aggregable(this, 'actual'   , this.name, this.actual, (value) => {this.truer = value;});
        // Value more close to the truth for this feature
        aggregable(this, 'truer'    , this.name, this.actual || this.estimated);

        // Clean feature to preserve the JSON structure accepted by firebase
        _.forEach(this, (value, key) => {_.isUndefined(value) && delete this[key]})

        Feature.increment(this.name);
    },
    methods: {
        toJSON () {
            // Return serialized version of only non undefined values
            return _.pick(_.omit(this, _.functions(this)), _.negate(_.isUndefined));
        }
    },
    static: {
        aggregates: {maximums: {}, minimums: {}},
        totals: {},
        many (source) {
            let names = [].slice.call(arguments, 1, arguments.length), features = {};
            source.features || (source.features = {});
            names.map((name) => {
                let feature = source.features[name] || {name: name};
                feature.name || (feature.name = name);
                features[name] = Feature(feature);
                // TODO
                // features.__proto__.incorporate = () => {source.incorporate.apply(source, arguments);};
            }, this);

            return features;
        },
        increment (name) {
            this.totals[name] = (this.totals[name] = 0);
            this.totals[name]++;
        },
        optimize (name, value) {
            var maximums = this.aggregates.maximums, minimums = this.aggregates.minimums;
            if (maximums[name] < value) {maximums[name] = value}
            if (minimums[name] > value) {minimums[name] = value}
        }
    }
}), aggregable = function (instance, property, feature, current, callback) {
    Object.defineProperty(instance, property, {
        enumerable: true,
        configurable: true,
        get () {return current;},
        set (value) {
            callback && callback(value, current);
            current = value;
            Feature.optimize(feature + '_' + property, current);
            return current;
        }
    });
};

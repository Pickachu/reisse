'use strict';

var Feature = stampit({
    init () {
        aggregable(this, 'relative' , this.name, this.relative);
        aggregable(this, 'estimated', this.name, this.estimated);
        aggregable(this, 'actual'   , this.name, this.actual, (value) => {this.truer = value;});
        aggregable(this, 'truer'    , this.name, this.actual || this.estimated);
        Feature.increment(this.name);
    },
    props: {
        // Value relative to features of other elements
        relative: null,
        // Estimated value for this feature on other elements
        estimated: null,
        // Actual value for this feature
        actual: null
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

            names.map((name) => {
                let capitalized = _.capitalize(name);

                features[name] = Feature({
                    name     : name,
                    relative : source[`relative${capitalized}` ],
                    estimated: source[`estimated${capitalized}`],
                    actual   : source[`actual${capitalized}`   ]
                });

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
        get () {return current;},
        set (value) {
            callback && callback(value, current);
            current = value;
            Feature.optimize(feature + '_' + property, current);
            return current;
        }
    });
};

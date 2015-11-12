'use strict';

var Feature = stampit({
    init () {
        this.relative  = aggregable(this.relative);
        this.estimated = aggregable(this.estimated);
        this.actual    = aggregable(this.actual, (value) => {this.truer = value;});
        this.truer     = aggregable(this.actual.value || this.estimated.value);
        Feature.increment(this.name);
    },
    props: {
        // Value relative to features of other elements
        relative: undefined,
        // Estimated value for this feature on other elements
        estimated: undefined,
        // Actual value for this feature
        actual: undefined
    },
    static: {
        totals: {},
        many (source) {
            let names = [].slice.call(arguments, 1, arguments.length), features = {};

            names.map((name) => {
                let capitalized = _.capitalize(name);
                features[name] = Feature({
                    name     : name,
                    relative : source[`relative${capitalized}` ] || null,
                    estimated: source[`estimated${capitalized}`] || null,
                    actual   : source[`actual${capitalized}`   ] || null
                });
            }, this);

            return features;
        },
        increment (name) {
            this.totals[name] = (this.totals[name] = 0);
            this.totals[name]++;
        }
    }
}), aggregable = (current, callback) => {
    let values = {value: current};

    return {
        get value () {
            return values.value;
        },
        set value (value) {
            callback && callback(value, values.value)
            values.value = value;
            if (this.maximum < value) {this.maximum = value}
            if (this.minimum > value) {this.minimum = value}

            return values.value;
        },
        maximum: null,
        minimum: null
    };
};

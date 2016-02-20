'use strict'

var estimatorable = stampit({
    init () {
        Object.keys(estimators).forEach((name) => {
            this.estimators.push(estimators[name]())
        });
    },
    props: {
        areas     : [],
        estimators: []
    },
    methods: {
        estimate () {
            this.estimators.forEach((estimator) => {
                estimator.estimate(this.ocurrences, this.areas);
            });

            return this.ocurrences;
        }
    }
}),
    estimators = {},
    Estimator  = estimatorable;

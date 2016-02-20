'use strict';

var byChance = (a, b) => {
    if (a.chance >  b.chance) return  1;
    if (a.chance == b.chance) return  0;
    if (a.chance <  b.chance) return -1;
};

var Re = stampit({
    static: {
        span: 24 * 60 * 60,
        chance: Classifiers.Chance,

        estimate (ocurrences) {
            let estimator = Estimator({ocurrences: ocurrences});
            estimator.estimate()
        },

        learn(ocurrences) {
            let past, now = Date.now();

            // Only learn from past ocurrences that actualiy happened
            past = ocurrences.filter((ocurrence) => ocurrence.start && ocurrence.start < now && ocurrence.features.chance.actual);

            Classifiers.Chance.initialize();
            Classifiers.Chance.learn(past);
            return {amount: past.length};
        },

        predict(ocurrences) {
            let future, now = Date.now();

            // Only try to predict future ocurrences
            future = ocurrences.filter((ocurrence) => !ocurrence.start || ocurrence.start > now);
            Classifiers.Chance.predict(future);

            // Incorporate features in ocurrence
            future.map((ocurrence) => ocurrence.incorporate())
            return future;
        },

        _computeAvailableTime () {
            let oneDay = ICAL.Duration.fromSeconds(24 * 60 * 60), midnight = ICAL.Time.now(), available;

            midnight.hour  = midnight.minute = midnight.second = 0;
            midnight.addDuration(oneDay);
            available      = midnight.subtractDate(ICAL.Time.now()).toSeconds();

            return available;
        },
        lisse(ocurrences) {
            let lisse = [], ocurrences, available;

            ocurrences = this.predict(ocurrences).sort(byChance);
            available  = this._computeAvailableTime();

            lisse     = lisse.concat(ocurrences.filter((ocurrence) => {
                available -= ocurrence.features.duration.estimated || 25 * 60 // a pomodoro of duration
                return available >= 0;
            }));

            // areas.forEach((area) => {
            //     let ocurrences = area.ocurrences, available;
            //     available = area.avarageDuration
            //     lisse     = lisse.concat(ocurrences.filter((ocurrence) => {
            //         available -= ocurrence.duration || ocurrence.estimatedDuration || area.avarageDuration
            //         return available >= 0;
            //     }));
            // });

            if (lisse.length > 50) {
                console.error("app: Your prediction probably failed and was handicapped to only 30 results.");
                lisse = lisse.splice(0, 30);
            }
            return lisse;
        }
    }
});

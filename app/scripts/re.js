'use strict';

var byChance = (a, b) => {
    if (a.chance >  b.chance) return  1;
    if (a.chance == b.chance) return  0;
    if (a.chance <  b.chance) return -1;
};

var Re = stampit({
    static: {
        span: 24 * 60 * 60,

        learn(areas) {
            let ocurrences = [], past, now = Date.now();
            areas.forEach((area) => {
                area.estimate();
                ocurrences = ocurrences.concat(area.ocurrences);
            });

            // Only learn from past ocurrences that actualiy happened
            past = ocurrences.filter((ocurrence) => ocurrence.start && ocurrence.start.getTime() < now && ocurrence.actualChance);

            Classifier.initialize();
            Classifier.learn(past);
            return {amount: past.length};
        },

        predict(areas) {
            let ocurrences = areas.map((area) => area.ocurrences).reduce(((ocurrences, total) => total.concat(ocurrences)), []),
                future, now = Date.now();

            // Only try to predict future ocurrences
            future = ocurrences.filter((ocurrence) => !ocurrence.start || ocurrence.start.getTime() > now);
            Classifier.predict(future);

            future.map((ocurrence) => ocurrence.features.incorporate())
            return future;
        },

        _computeAvailableTime () {
            let oneDay = ICAL.Duration.fromSeconds(24 * 60 * 60), midnight = ICAL.Time.now(), available;

            midnight.hour  = midnight.minute = midnight.second = 0;
            midnight.addDuration(oneDay);
            available      = midnight.subtractDate(ICAL.Time.now()).toSeconds();

            return available;
        },
        lisse(areas) {
            let lisse = [], ocurrences, available;

            ocurrences = this.predict(areas).sort(byChance);
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

            return lisse;
        }
    }
});

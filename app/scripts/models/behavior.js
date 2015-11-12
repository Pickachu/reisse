'use strict';

var Behavior = stampit({
    init () {
        Object.assign(this.features, Feature.many(this, 'chance', 'motivation', 'simplicity'));
    },
    props: {
        features: {}
    },
    methods: {
        simplicity (full, type) {
            type || (type = 'actual')

            var money = 0, time = 0, cycles = 0, effort = 0, social = 0, routine = 0, simplicity = 0;

            time = this.features.duration[type].value || 0;

            console.log("name", this.name);
            console.log("money:", money, "time:", time, "cycles:", cycles, "effort:", effort, "social:", social, "routine:", routine);

            return [money, time, cycles, effort, social, routine];
        },


        motivation (full, type) {
            type || (type = 'actual')

            var sensation = 0, anticipation = 0, belonging = 0;

            console.log("sensation:", sensation, "anticipation:", anticipation, "belonging:", belonging);
            return [sensation, anticipation, belonging];
        }

    }
});

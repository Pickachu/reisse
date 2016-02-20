'use strict';

var behavioral = stampit({
    init () {
        Object.assign(this.features, Feature.many(this, 'chance', 'motivation', 'simplicity'));
    },
    props: {
        features: {}
    },

    methods: {
        simplicity (full, type) {
            type || (type = 'actual');
            let features = this.features;
            let money = -1, time = -1, cycles = -1, effort = -1, social = -1, routine = -1, simplicity = -1;

            time = +features.duration[type] || -1;

            // console.log("name", this.name);
            // console.log("money:", money, "time:", time, "cycles:", cycles, "effort:", effort, "social:", social, "routine:", routine);

            return [money, time, cycles, effort, social, routine];
        },


        motivation (full, type) {
            type || (type = 'actual')

            var sensation = -1, anticipation = -1, belonging = -1;

            // console.log("sensation:", sensation, "anticipation:", anticipation, "belonging:", belonging);
            return [sensation, anticipation, belonging];
        }

    }
}), Behavior = behavioral;

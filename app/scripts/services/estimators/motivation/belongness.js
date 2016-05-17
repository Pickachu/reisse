'use strict';

// TODO Mark as dependent from location estimator
estimators.belongness = stampit({
  init () {},
  methods: {
    estimate() {
      // let learnable = Re.learnableSet(ocurrences);
      // this.contextualize(ocurrences);
      return this.when('location').then(this.inferActualBelongness);
    },

    // contextualize (ocurrences) {
    //   let startTime = new Date();
    //   ocurrences.forEach((ocurrence) => {
    //     // TODO use other property than completedAt, after infering task execution
    //     // by pomodoro duration
    //     ocurrence.context.startTime = ocurrence.completedAt || startTime;
    //   });
    // },

    inferActualBelongness (ocurrences) {
      ocurrences = Re.learnableSet(ocurrences);

      let venues = _(ocurrences).map('context.venue').uniq('name').flatten().cloneDeep(),
      visits = [],
      first  = ocurrences[0];

      _(ocurrences)
        // Only infer actual belongness for past ocurrences
        .filter('completedAt')
        .sortBy('completedAt')
        .reduce((accumulator, ocurrence) => {
          // TODO fetch venues by id
          let venue       = venues.find((v) => v.name === ocurrence.context.venue.name),
            current       = ocurrence.completedAt.getTime(),
            previousVisit = accumulator[0],
            previousVenue = accumulator[1],
            visit         = undefined;

          // Last ocurrence was on the same place
          if (previousVenue.name === venue.name) {
            previousVisit.duration = current - previousVisit.endedAt.getTime();
            previousVisit.endedAt  = ocurrence.completedAt;

            visit = previousVisit;

          // Last ocurrence was on a different place
          // TODO consider commute time
          } else {
            visit = {
              duration: current - previousVisit.endedAt.getTime(),
              endedAt : ocurrence.completedAt
            };
          };

          venue.time || (venue.time = {total: 0, visits: 0});
          venue.time.total += visit.duration / 1000;
          venue.time.visits++;

          // TODO figure out what is the maximun belongness
          ocurrence.features.belongness.actual = venue.time.total / (24 * 60 * 60)

          return [visit, ocurrence.context.venue];
        }, [{endedAt: first.completedAt}, first.context.venue]);

      return ocurrences;
    }
  }
});

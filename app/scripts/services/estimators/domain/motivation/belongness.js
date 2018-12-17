'use strict';

// Belongness estimator
// • TODO Mark as dependent from location estimator
// • TODO perhaps is a great idea to move BJFogg factors estimation to the domain model?
// • Since there are no specific devices to measure/extract belongness values from humans
// and we are using the BJ Fogg conceptual sensation construct.
// • The actual belongness value is a prediction based on actual measurable
// values (visit duration (time stayed on a location) for now) for occurrences that have happened.
Estimator.add(stampit({
  refs: {
    name: 'belongness'
  },
  init () {},
  methods: {
    estimate() {
      // let learnable = Re.learnableSet(occurrences);
      // this.contextualize(occurrences);
      return this.when('location').then(this.inferActualBelongness);
    },

    // contextualize (occurrences) {
    //   let startTime = new Date();
    //   occurrences.forEach((ocurrence) => {
    //     // TODO use other property than completedAt, after infering task execution
    //     // by pomodoro duration
    //     ocurrence.context.startTime = ocurrence.completedAt || startTime;
    //   });
    // },

    inferActualBelongness (occurrences) {
      // TODO do not access external method here
      occurrences = Re.learnableSet(occurrences);

      let venues = _(occurrences).map('context.venue').uniq('name').flatten().cloneDeep(),
      visits = [],
      first  = occurrences[0];

      if (!occurrences.length) return occurrences;

      _(occurrences)
        // Only infer actual belongness for past occurrences
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

          // TODO figure out what is the maximum belongness
          ocurrence.features.belongness.actual = venue.time.total / (24 * 60 * 60)

          return [visit, ocurrence.context.venue];
        }, [{endedAt: first.completedAt}, first.context.venue]);

      return occurrences;
    }
  }
}));

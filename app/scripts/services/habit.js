'use strict';

/**
 * Habits
 *
 * Habitual ocurrences cannot influence on classifiers training unless explicitly
 * marked as accurate by the user. Even then it should influence real data values only mildly.
 * eg.: a meal habit cannot influence the macronutrients predictor, since it just has the
 * heuristically guessed macronutrient content of a meal
 *
 * @type {stamp}
 */
const habits = stampit({
  // TODO create or remove bound when
  init() {
    Object.keys(Habit.stamps).forEach((name) => {
      this.habitualizers.push(Habit.get(name, {
        areas: this.areas,
        when: this.when.bind(this)
      }));
    });
  },
  props: {
    habitualizers   : [],
    habitualizations: []
  },
  methods: {
    // TODO elaborate habitual ocurrences
    for (ocurrences, context) {
      this.habitualizations = this.habitualizers.map((habitualizer) => {
        console.log("habitualizing", habitualizer.name);
        return habitualizer.habitualize(ocurrences, context);
      });

      // TODO return only habits and not all ocurrences
      return Promise.all(this.habitualizations).then(() => ocurrences);
    },
    when (name) {
      let habitualizer = this.habitualizers.findIndex((habitualizer) => habitualizer.name == name);
      if (!this.habitualizations[habitualizer]) throw new TypeError(`This habitualizer ${name} does not return a promise or does not exist.`);
      return this.habitualizations[habitualizer];
    }
  },
  static: {
    stamps: {},
    habitualizers: [],
    find (predicate) {
      return this.habitualizers[predicate] || _.find(this.habitualizers, predicate) || null;
    },
    get (name, options) {
      return this[name] = this.stamps[name](options);
    },
    add (stamp) {
      if (!stamp.fixed.refs.name) {throw new TypeError("Habit.add: name is a mandatory property.")}
      this.stamps[stamp.fixed.refs.name] = habitualizable.compose(stamp);
    }
  }
});

const habitualizable = stampit({
  props: {
    areas: []
  },
  methods: {
    // Given a set of sorted behaviors and a specific context with a time set
    // Return all unfiled time slots at the past 24 hours before the context time
    getMisteriousTime(behaviors, context) {
      const {calendar: {now}} = context,
        yesterday = moment(now).subtract(1, 'day').toDate();

      return _(behaviors)
        .filter((behavior) => behavior.start > yesterday && behavior.end < now)

        // When no behavior happened in context time frame, all the time is misterious
        .thru((behaviors) =>
          (behaviors.length) ? behaviors : [{ start: null, end: yesterday }]
        )

        .sortBy('start')
        .map((behavior, index, behaviors) => {
          const next = behavior[index + 1] ? behavior[index + 1] : {start: now, end: null};

          // create a misterious time slot
          return {
            start: behavior.end,
            end: next.start
          };

        });
    }
  }
})

const Habit = habits;

'use strict';

// Habits
// Habitual ocurrences cannot influence on classifiers training unless explicitly
// marked as accurate by the user. Even then it should influence real data values only mildly,
//  eg.: a meal habit cannot influence the macronutrients predictor, since it just guessed the macronutrient
// content of a meal
var habitualizable = stampit({
  init () {
    Habit.habitualizers.forEach((habitualizer) => {
      this.habitualizers.push(habitualizer({
        areas: this.areas,
        when: this.boundWhen
      }));
    });
  },
  props: {
    areas             : [],
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

      // TODO return only habits
      return Promise.all(this.habitualizations).then(() => this.ocurrences);
    },
    when (name) {
      let habitualizer = this.habitualizers.findIndex((habitualizer) => habitualizer.name == name);
      if (!this.habitualizations[habitualizer]) throw new TypeError(`This habitualizer ${name} does not return a promise or does not exist.`);
      return this.habitualizations[habitualizer];
    }
  },
  static: {
    habitualizers: [],
    add (habit) {
      this.habitualizers.push(habit);
    }
  }
});

var Habit = habitualizable;

'use strict';

estimators.weight = stampit({
  refs: {
    // Calories by Macronutrient: http://www.fao.org/docrep/006/y5022e/y5022e04.htm
    _CALORIES_BY: {
      fat: 9,
      protein: 4,
      carbohydrate: 4,
      fiber: 4
    }
  },

  methods: {
    estimate(ocurrences) {
      let learnable = Re.learnableSet(ocurrences);

      return _(learnable)
        .filter({activity: {type: 'meal'}})
        .value()
        .map(this.inferActualWeight, this);
    },

    // TODO query jawbone up for the actual portion sides
    inferActualWeight (meal) {
      if (!meal.calories) return;

      let ratios = this._macronutrientRatiosFor(meal);

      let macronutrientWeight =
        meal.calories * ratios.fat          / this._CALORIES_BY.fat +
        meal.calories * ratios.protein      / this._CALORIES_BY.protein +
        meal.calories * ratios.carbohydrate / this._CALORIES_BY.carbohydrate;

      // TODO think how to count fiber caloric content

      // Average water content: http://image.slidesharecdn.com/foodchemistry-150816130301-lva1-app6892/95/food-chemistry-11-638.jpg?cb=1439730532
      macronutrientWeight += macronutrientWeight * 0.5;
      meal.weight = macronutrientWeight;
    },

    _macronutrientRatiosFor(meal) {
      let size = _.reduce(meal.macronutrients, (accumulator, macronutrient) => {
        return accumulator + macronutrient.total;
      }, 0) || 1;

      return _.transform(meal.macronutrients, (accumulator, macronutrient, name) => {
        accumulator[name] = macronutrient.total / size;
      }, {});
    }
  }
});

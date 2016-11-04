'use strict'

// Hunger is mainly equal a reward system modulated habit with two rewards per forkful
Classifier.add(stampit({
  refs: {
    name: 'hunger'
  },
  init () {
    this.stage();
  },
  methods: {
    stage () {
      let Architect   = synaptic.Architect;

      console.warn("classifier.hunger: FIXME: Reimport meal data to set start event property!")
      if (app.ocurrences) _.compact(app.ocurrences.map((o) => o.activity && o.activity.type == 'meal' && (o.start = o.completedAt)));

      this.perceptron   = new Architect.Perceptron(3, 15, 1);

      // TODO figure eating history influence on next meal
      // let twoMothsAgo = Date.now() - 8 * 30 * 24 * 60 * 60 * 1000;
      // this.timeCap = new Date(twoMothsAgo);
    },
    learn(behaviors) {
      let mapper, set;

      set = _(behaviors)
        .filter({activity: {type: 'meal'}})
        .filter((o, i, bs) => i > (0.7 * bs.length))
        .sortBy('completedAt')
        .tap((behaviors) => {mapper = this._createMapper(behaviors); return behaviors;})
        .map((behavior, index, behaviors) => {
          return {
            input : mapper.input(behavior),
            output: mapper.output(behavior)
          };
        }).value();

      // Train network
      let learning            = this.perceptron.trainer.train(set, {iterations: 1000, log: 100});
      learning.set        = set;
      learning.mapper     = mapper;
      learning.sampleSize = set.length;
      return learning;
    },
    predict(behaviors) {
    },
    performate(behaviors) {
      let learning, mapper, graphs = [], data = [], data2 = [];

      this.stage();
      // TODO estimate meal start time
      learning = this.learn(Re.learnableSet(behaviors));
      mapper   = learning.mapper;

      let compare = function compareValues(v1, v2) {
          return (v1 > v2)
              ? 1
              : (v1 < v2 ? -1 : 0);
      };

      _(this.subsets([1, 0.75, 0.5, 0.25, 0], 3))
        .map((compostion, index) => {
          let satiety = mapper.denormalize(this.perceptron.activate(compostion));
          return {
            composition: compostion,
            satiety: satiety
          };
        })
        .sortBy('satiety')
        .tap((screening) => {
          let valuefy = (value, index) => {
            return {x: index, y: value};
          };

          let sortedSet = learning.set.sort((a, b) => {
            var result = compare(a.input[0], b.input[0]);

            return result === 0
                ? compare(a.output[0], b.output[0])
                : result;
          });

          _(mapper.macronutrients).each((name, index) => {
            data.push({
              key: _.upperFirst(name),
              values: _.map(screening, 'composition.' + index)
                .map(valuefy)
            });

            data2.push({
              key: _.upperFirst(name),
              values: _.map(sortedSet, 'input.' + index)
                .map(valuefy)
            });
          })

          data.push({
            key: "Satiety",
            values: _(screening)
              .map('satiety')
              .map(valuefy)
              .value()
          });

          data2.push({
            key: "Satiety",
            values: _(sortedSet)
              .map('output.0')
              .map(valuefy)
              .value()
          });
        }).value();

      graphs.push({
        data: data,
        stats: learning,
        type: 'scatter'
      });

      graphs.push({
        data: data2,
        stats: learning,
        type: 'scatter'
      });

      return Promise.resolve({graphs: graphs});
    },
    // Assumes only meal behaviors sorted by completedAt date
    _createMapper (meals) {
      // TODO move to feature aggregator
      let edges = _(meals).reduce((aggregates, meal, index, meals) => {
        let next = meals[index + 1] || {completedAt: new Date()};

        _(meal.macronutrients).each((macronutrient, name) => {
          let aggregate = aggregates[name];
          aggregate.min = Math.min(aggregate.min, macronutrient.total);
          aggregate.max = Math.max(aggregate.max, macronutrient.total);
        });

        // TODO move to satiety estimator:
        let satiety = next.completedAt - meal.completedAt;
        meal.features.satiety || (meal.features.satiety = {});

        // TODO figure out how to avoid missing data points (usually because people have not registered data)
        if (satiety / (24 * 60 * 60 * 1000) > 2) satiety = 2 * 24 * 60 * 60 * 1000;

        meal.features.satiety.actual = satiety / 1000;

        aggregates.maximumSatiety = Math.max(aggregates.maximumSatiety, satiety);

        return aggregates;
      }, {
        fat: {min: 0, max: 0},
        protein: {min: 0, max: 0},
        fiber: {min: 0, max: 0},
        carbohydrate: {min: 0, max: 0},
        maximumSatiety: 0
      });

      return {
        macronutrients: ['fat', 'protein', 'fiber', 'carbohydrate'],
        edges: edges,
        // Return % of macronutrient per meal
        input (meal) {
          let size = _.reduce(meal.macronutrients, (accumulator, macronutrient) => {
            return accumulator + macronutrient.total;
          }, 0) || 1;

          return _.transform(meal.macronutrients, (accumulator, macronutrient, name) => {
            let index = this.macronutrients.indexOf(name);
            accumulator[index] = macronutrient.total / size;
          }, new Array(this.macronutrients.length).fill(0));
        },
        output (meal) {return [meal.features.satiety.actual / (this.edges.maximumSatiety / 1000)];},
        denormalize (output) {
          return output;
        }
      }
    },

    subsets (set, size) {
      let results = [], result, i;

      for (let x = 0; x < Math.pow(2, set.length); x++) {
        result = [];
        i = set.length - 1;
        do {
          if ((x & (1 << i)) !== 0) result.push(set[i]);
        }  while (i--);

        if (result.length >= size) results.push(result);
      }
      return results;
    },

    quality (predictions) {
      // let grouped = _.groupBy(predictions, (p) => p[2])
      // return {
      //   success: grouped.true.length / predictions.length
      // }
    }
  }
}));

'use strict'

// Hunger is mainly equal a reward system modulated habit with two rewards per forkful
// TODO create satiety estimator, that is a
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

      this.perceptron   = new Architect.Perceptron(4, 15, 1);

      // TODO figure eating history influence on next meal
      // let twoMothsAgo = Date.now() - 8 * 30 * 24 * 60 * 60 * 1000;
      // this.timeCap = new Date(twoMothsAgo);
    },
    learn(behaviors) {
      let set = _(behaviors)
        .filter({activity: {type: 'meal'}})
        .filter((o, i, bs) => i > (0.7 * bs.length))
        .sortBy('completedAt')
        .tap((behaviors) => this.mapper = this._createMapper(behaviors), behaviors)
        .map((behavior, index, behaviors) => {
          return {
            input : this.mapper.input(behavior),
            output: this.mapper.output(behavior)
          };
        }).value();

      // Train network
      let learning        = this.perceptron.trainer.train(set, {iterations: 1000, log: 100});
      learning.set        = set;
      learning.mapper     = this.mapper;
      learning.sampleSize = set.length;
      return learning;
    },
    predict(behaviors) {
      let mapper = this.mapper, last = {calendar: {}}, predictions;

      predictions = _(behaviors)
        .sortBy('context.calendar.now')
        .map((behavior) => {
          let activityType = behavior.activity && behavior.activity.type, context = behavior.context;

          if (!context.calendar.now) return this.skips.push(behavior);

          if (activityType == 'meal') {
            last.satiety  = mapper.denormalize(this.perceptron.activate(mapper.input(behavior)));
            last.calendar = context.calendar;
            return last.satiety / mapper.edges.maximumSatiety; // TODO figure out how much hunger someone feels while eating (satiation)
          } else {
            // TODO better criterion to skip until first meal
            if (!last.calendar.now   ) return this.skips.push(behavior);

            if (behavior.features.hunger) {
              let satiety = (last.satiety - (context.calendar.now - last.calendar.now) / 1000) / mapper.edges.maximumSatiety;
              // TODO better dealing with long high hungry periods
              return 1 - Math.min(Math.max(satiety, 0), 1);
            } else {
              this.skips.push(behavior);
            }
          }

          // TODO make estimation based on daytime, habitual mean durations, etc.
          return 0.5;
        })
        .value();


      return Promise.resolve(predictions);
    },
    performate(behaviors) {
      let learning, mapper, graphs = [], data = [], data2 = [];

      this.stage();
      // TODO estimate meal start time
      learning = this.learn(Re.learnableSet(behaviors));
      mapper   = learning.mapper;

      let compare = function compareValues(v1, v2) {
          return (v1 > v2) ? 1 : (v1 < v2 ? -1 : 0);
      }, compositions = function (one, second, third, four) {
        let numbers = [];
        one.forEach((value, index) =>
          second.forEach((subvalue) =>
            third.forEach((subsubvalue) =>
              four.forEach((subsubsubvalue) =>
                numbers.push([value, subvalue, subsubvalue, subsubsubvalue])
              )
            )
          )
        );

        return numbers.filter((composition) => ss.sum(composition) <= 1);
      },
      source = [0, 0.25, 0.5, 0.75, 1];

      _(compositions(source, source, source, source))
        .map((composition, index) => {
          let satiety = this.perceptron.activate(composition);
          return {
            composition: composition,
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
        title: 'Composition By Meal',
        data: data,
        meta: learning,
        type: 'scatter'
      });

      graphs.push({
        title: 'Learning Map',
        data: data2,
        meta: learning,
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

      edges.maximumSatiety = edges.maximumSatiety / 1000;

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
        output (meal) {return [meal.features.satiety.actual / this.edges.maximumSatiety];},
        denormalize (output) { return output * this.edges.maximumSatiety; }
      }
    },

    quality (predictions) {
      // let grouped = _.groupBy(predictions, (p) => p[2])
      // return {
      //   success: grouped.true.length / predictions.length
      // }
    }
  }
}));

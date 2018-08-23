/* globals moment, Classifier  */
'use strict';

// = Frequency Classsifier
// Frequency is how many ocurrences happen per amount of time
// As input it receives a specie and a weekly frequency of that species
// As output it will drop the frequency by week
Classifier.add(stampit({
  refs: {
    name: 'frequency'
  },
  init () {
    this.stage();
  },
  methods: {
    stage () {
      let Architect   = synaptic.Architect;
      this.network = new Architect.LSTM(2, 5, 5, 1);

      // let twoMothsAgo = Date.now() - 8 * 30 * 24 * 60 * 60 * 1000;
      // this.timeCap = new Date(twoMothsAgo);
    },

    learn(behaviors) {
      let mapper, set;

      set = _(this.learnableSet(behaviors, {sorted: 1, size: 0.3}))
        .tap((behaviors) => mapper = this._createMapper(behaviors), behaviors)
        // FIXME user ocurrence specie instead of activity type
        // FIXME group by center of duration
        .groupBy((o) => moment(o.completedAt).format('Y-WW') + '-' + (o.activity && o.activity.type || 'unknown'))
        .toPairs()
        .map((pair, index, pairs) => {
          if (index == pairs.length - 1) return; // ignore last item
          let next = pairs[index + 1];

          return {
            // FIXME consider location and ocurrence type
            input : mapper.input(pair),
            output: mapper.output(next)
          };
        }).value();

      // last learning example does not exist
      set.pop();

      // Train network
      let learning        = this.network.trainer.train(set, {iterations: 100, log: 100});
      learning.set        = set;
      learning.mapper     = mapper;
      learning.sampleSize = set.length;
      return Promise.resolve(learning);
    },
    predict(behaviors) {
      let mapper = this._createMapper(behaviors),
        contextualNow = this.context.calendar.now,
        // TODO discover the best range to predict behavior habitual frequency, is it 2 years?
        // probably is the time it takes to form an habit
        // FIXME import 2017 and 2018 meal dataset and remove this subtraction
        start  = moment(contextualNow).startOf('year').subtract(2, 'year').valueOf(),
        finish = moment(contextualNow).endOf('year').subtract(1, 'year').valueOf();

      return Promise.resolve(_(behaviors)
        .filter( (o) => o.completedAt && start < o.completedAt && o.completedAt < finish )
        .groupBy((o) => moment(o.completedAt).format('Y-WW') + '-' + (o.activity && o.activity.type || 'unknown'))
        .toPairs()
        .map((pair, index, pairs) => {
          let splitted = pair[0].split('-'), specie = splitted.pop();

          return {
            frequency: mapper.denormalize(this.network.activate(mapper.input(pair)), specie),
            specie: specie,
            week: splitted.join('-')
          };
        })
        .value());
    },
    performate(behaviors) {
      let mapper, graphs = [], data = [], columns = [],
        performatable = this.performatableSet(behaviors);

      this.stage();

      return this.learn(performatable).then((learning) => {
        mapper   = learning.mapper;
        let species = mapper.species;
        columns = species.map((specie) => ({key: specie, values: []}));

        _(performatable)
          // FIXME group by center of duration
          .sortBy('completedAt')
          .groupBy((o) => moment(o.completedAt).format('Y-WW'))
          .toPairs()
          // FIXME user ocurrence specie instead of activity type
          .each((pair) => {
            let counts = _.groupBy(pair[1] /* ocurrences */, (o) => o.activity && o.activity.type || 'unknown');

            species.forEach((specie) => {
              let ocurrences = counts[specie] || [],
              index = species.indexOf(specie),
              column = columns[index];

              column.values.push({
                x: pair[0], // week number
                y: ocurrences.length
              });
            });
          });

        graphs.push({data: columns, meta: {title: 'Activity Type by Week Index'}, type: 'multi-bar'});
        columns = species.map((specie) => ({key: "Actual " + specie, values: []}));
        columns = columns.concat(species.map((specie) => ({key: "Predicted " + specie, values: []})));

        _(performatable)
          .sortBy('completedAt')
          // FIXME group by center of duration
          .groupBy((o) => moment(o.completedAt).format('Y-WW'))
          .toPairs()
          // FIXME user ocurrence specie instead of activity type
          .each((pair) => {
            let counts = _.groupBy(pair[1] /* ocurrences */, (o) => o.activity && o.activity.type || 'unknown');

            species.forEach((specie) => {
              let ocurrences = counts[specie] || [],
              index = species.indexOf(specie),
              column = columns[index];

              column.values.push({
                x: pair[0], // week number
                y: ocurrences.length
              });

              column = columns[index + species.length];

              column.values.push({
                x: pair[0], // week number
                y: mapper.denormalize(this.network.activate(mapper.input(['dummy-' + specie, ocurrences])), specie)
              });
            });
          });

        graphs.push({data: columns, meta: {title: 'Activity Type by Week Index'}, type: 'multi-bar'});

        // learning = this.learn(performatable);
        // mapper   = learning.mapper;
        // columns  = mapper.species.map((specie) => {return {key: specie, values: []}});
        //
        // while (hours--) {
        //   input        = baseInput.concat([]);
        //   input[hours] = 1;
        //
        //   output      = this.perceptron.activate(input);
        //   columns.forEach((column, index) => {
        //     column.values.unshift({
        //       x: hours,
        //       y: output[index]
        //     });
        //   });
        // }
        //
        // learning.title = "Classifier Output By Daytime";
        // graphs.push({data: columns, meta: learning, type: 'multi-bar'});


        return Promise.resolve({graphs: graphs});
      });
    },
    // Assumes behaviors sorted by completedAt date
    _createMapper (behaviors) {
      let maximums = {}, species = ['unknown', 'meal', 'sleep'];
      // FIXME user ocurrence specie instead of activity type
      // FIXME group by center of duration
      // FIXME create a new entity that represents a group of ocurrences
      _(behaviors)
        .groupBy((o) => moment(o.completedAt).format('Y-WW') + '-' + (o.activity && o.activity.type || 'unknown'))
        .toPairs()
        .each((pair, index, pairs) => {
          let splitted = pair[0].split('-'), inputs = [], specie = species.indexOf(splitted.pop());
          maximums[specie] = Math.max(pair[1].length, maximums[specie] || 0);
        });


      return {
        // FIXME use ocurrence specie instead of activity type
        species: species,
        maximums: maximums,
        input  (pair) {
          let splitted = pair[0].split('-'), inputs = [], specie = this.species.indexOf(splitted.pop());

          inputs.push(pair[1].length / maximums[specie]);
          inputs.push(specie / this.species.length);

          return inputs;
        },
        output (pair) {
          let splitted = pair[0].split('-'), specie = this.species.indexOf(splitted.pop());
          return [pair[1].length / maximums[specie]];
        },
        denormalize (output, specie) { return output * maximums[species.indexOf(specie)]; }
      };
    },

    quality (predictions) {
      // let grouped = _.groupBy(predictions, (p) => p[2])
      // return {
      //   success: grouped.true.length / predictions.length
      // }
    }
  }
}));

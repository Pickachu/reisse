/* globals moment, Classifier  */
'use strict';

// = Frequency Classsifier
// Frequency is how many ocurrences happen per amount of time
// As input it receives a specie and a weekly frequency of that species
// As output it gives the frequency by week
Classifier.add(stampit({
  init () {
    this.stage();
  },
  refs: {
    name: 'frequency',
    stage () {
      let Architect   = synaptic.Architect;
      this.network = new Architect.LSTM(2, 5, 5, 1);

      // let twoMothsAgo = Date.now() - 8 * 30 * 24 * 60 * 60 * 1000;
      // this.timeCap = new Date(twoMothsAgo);
    },

    async learn(behaviors) {

      const set = _(this.learnableSet(behaviors, {sorted: 1, size: 0.3}))
        .tap((behaviors) => this.mapper = this._createMapper(behaviors), behaviors)
        // FIXME use ocurrence specie instead of activity type
        // FIXME group by center of duration
        .groupBy(({completedAt, activity = {type: 'unknown'}}) =>
          moment(completedAt).format('Y-WW') + '-' + activity.type
        )
        .toPairs()
        .map((pair, index, pairs) => {
          if (index == pairs.length - 1) return; // ignore last item
          let next = pairs[index + 1];

          return {
            // FIXME consider location and ocurrence type
            input : this.mapper.input(pair),
            output: this.mapper.output(next)
          };
        }).value();

      // last learning example does not exist
      set.pop();

      // Train network
      return this._train(set, {iterations: 100, log: 100});
    },

    async predict(behaviors) {
      let mapper = this._createMapper(behaviors),
        contextualNow = this.context.calendar.now,
        // TODO discover the best range to predict behavior habitual frequency, is it 2 years?
        // probably is the time it takes to form an habit
        // FIXME import 2017 and 2018 meal dataset and remove this subtraction
        start  = moment(contextualNow).startOf('year').subtract(2, 'year').valueOf(),
        finish = moment(contextualNow).endOf('year').subtract(1, 'year').valueOf();

      return _(behaviors)
        .filter( ({completedAt}) => completedAt && start < completedAt && completedAt < finish )
        .groupBy(({completedAt, activity = {type: 'unknown'}}) =>
          moment(completedAt).format('Y-WW') + '-' + activity.type
        )
        .toPairs()
        .map((pair, index, pairs) => {
          let splitted = pair[0].split('-'), specie = splitted.pop();

          return {
            frequency: mapper.denormalize(this.network.activate(mapper.input(pair)), specie),
            specie, week: splitted.join('-')
          };
        })
        .value();
    },
    async performate(behaviors) {
      let graphs = [], data = [], columns = [], meta,
        performatable = this.performatableSet(behaviors);

      this.stage();
      const learning = await this.learn(performatable);

      let {mapper} = learning;
      let {species} = mapper;

      columns = species.map((specie) => ({key: specie, values: []}));

      _(performatable)
        // FIXME group by center of duration
        .sortBy('completedAt')
        .groupBy(({completedAt}) => moment(completedAt).format('Y-WW'))
        .toPairs()
        // FIXME user ocurrence specie instead of activity type
        .each((pair) => {
          let counts = _.groupBy(pair[1] /* ocurrences */, ({activity = {type: 'unknown'}}) => activity.type);

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

      meta = Object.assign({}, learning, {
        title: 'Activity Type by Week Index',
        options: { axis: {x: {axisLabel: 'Week Index'}, y: {axisLabel: 'Count of Activities of Type'}}, }
      });
      graphs.push({data: columns, meta, type: 'multi-bar'});

      columns = species
        .map((specie) => ({key: "Actual " + specie, values: []}))
        .concat(species.map((specie) => ({key: "Predicted " + specie, values: []})));

      _(performatable)
        .sortBy('completedAt')
        // FIXME group by center of duration
        .groupBy(({completedAt}) => moment(completedAt).format('Y-WW'))
        .toPairs()
        // FIXME use ocurrence specie instead of activity type
        .each((pair) => {
          let counts = _.groupBy(pair[1] /* ocurrences */, ({activity = {type: 'unknown'}}) => activity.type);

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

      meta = Object.assign({}, learning, {
        title: 'Predicted Activity Type by Week Index',
        options: { axis: {x: {axisLabel: 'Week Index'}, y: {axisLabel: 'Count of Activities of Type'}}}
      });
      graphs.push({data: columns, meta, type: 'multi-bar'});

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


      return {graphs};
    },
    // Assumes behaviors sorted by completedAt date
    _createMapper (behaviors) {
      // TODO compute species from behavior set
      const species = ['unknown', 'meal', 'sleep', 'browse'];
      const maximums = new Array(species.length).fill(1);

      // FIXME user ocurrence specie instead of activity type
      // FIXME group by center of duration
      // FIXME create a new entity that represents a group of ocurrences!
      _(behaviors)
        .groupBy(({completedAt, activity = {type: 'unknown'}}) =>
          moment(completedAt).format('Y-WW') + '-' + activity.type
        )
        .toPairs()
        .each((pair, index, pairs) => {
          let splitted = pair[0].split('-'), inputs = [], specie = species.indexOf(splitted.pop());
          maximums[specie] = Math.max(pair[1].length, maximums[specie]);
        });


      return {
        // FIXME use ocurrence specie instead of activity type
        species, maximums,
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
    }
  }
}));

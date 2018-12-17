// Implementation of https://workflowy.com/#/1866981390e0
'use strict';

Classifier.add(stampit({
  init () { this.stage() },
  props: {
    training: {log: 100, iterations: 1000},
  },
  refs: {
    name: 'chance',

    stage({training, relearn = true} = {}) {
      const {Architect}   = synaptic;
      this.network = new Architect.Perceptron(2, 3, 1);

      ['Simplicity', 'Motivation'].forEach((name, index) => {
        this.network.layers.input.list[index].label = name;
      });
      ['Chance'].forEach((name, index) => {
        this.network.layers.output.list[index].label = name;
      });

      this.simplicity = Classifier.simplicity || Classifier.get('simplicity');
      this.motivation = Classifier.motivation || Classifier.get('motivation');
      this.training   = Object.assign(this.training, training);
      this.learned    = null;
    },

    async learn (occurrences) {
      await this.simplicity.learn(occurrences);
      await this.motivation.learn(occurrences);

      const set = _(occurrences)
        .filter(({features}) => isFinite(features.chance.actual))
        // TODO Treat learning of already started behaviors but unfinished
        .thru(this.learnableSet.bind(this))
        .tap((occurrences) => console.log('[classifier.chance] learning from', occurrences.length, 'occurrences'))
        .map((occurrence) => {
          // TODO get learning from occurrence instead of simplicity prediction
          let inputs = [
            ss.min(occurrence.simplicity(true, 'actual')),
            this.motivation.activate(occurrence.motivation(true, 'actual'))[0]
          ];

          // Validate actual chance distribution space
          // (x - 1.1) ^ 2 + (y - 1.1) ^ 2 - 1 = 0
          return {
            input: inputs,
            output: [occurrence.features.chance.actual]
          };
        })
        .compact()
        .value();

      return this._train(set, this.training);
    },

    async predict (behaviors, {context}) {

      const predictions = await Promise.all([
        this.motivation.predict(behaviors, {context}),
        this.simplicity.predict(behaviors, {context})
      ]);

      behaviors.forEach( ({features}) => {
        features.chance.estimated = this.activate([

          features.simplicity.estimated,
          features.motivation.estimated

        ])[0];

        if (_.isNaN(features.chance.estimated)) {
          throw new TypeError(`[classifier.chance::predict]: Chance prediction with NaN for an occurrence!`);
        };
      });

      return predictions;
    },

    async performate(behaviors, options = {}) {
      this.stage(options.stage);

      // TODO better integration of Re estimatives
      const estimated = await Re.estimate(behaviors, app.areas.concat());
      const performatable = this.performatableSet(estimated);
      const learning = await this.learn(performatable.filter(({status}) =>
        status === 'complete'
      ));
      const context = await Context().for(new Date());
      await this.predict(performatable.filter(({status}) =>
        status === 'open'
      ), {context});

      const data = _(performatable)
        .flatten()
        .sortBy([
          'features.chance.estimated',
          'features.motivation.estimated',
          'features.simplicity.estimated'
        ])
        .map((occurrence, index) => {
          const {features: {simplicity, motivation, chance}} = occurrence;
          return [{
            occurrence,
            kind: 'predicted simplicity',
            x: index, y: simplicity.estimated || 0
          }, {
            occurrence,
            kind: 'predicted motivation',
            x: index, y: motivation.estimated || 0
          }, {
            occurrence,
            kind: 'predicted motivation + simplicity',
            x: index, y: simplicity.estimated + motivation.estimated
          }, {
            occurrence,
            kind: 'predicted chance',
            x: index, y: chance.estimated || 0
          }];
        })
        .flatten()
        // .map((value) => Object.assign(value, { y: parseFloat(value.y.toFixed(3)) }))
        .groupBy('kind')
        .map((group, index) => {
          const values = _(group)
            .groupBy('y')
            .map((subgroup) => ({
              x: subgroup[0].x, y: subgroup[0].y,
              size: subgroup.length,
              occurrences: subgroup.map(({occurrence}) => occurrence)
            }))
            .value()

          return {key: _.upperFirst(group[0].kind), values};
        })
        .value();

      const meta = Object.assign(learning, {
        context, performatable,
        title: "Chance Estimation",
        options({xAxis, yAxis, yDomain, tooltip}, chart) {
          xAxis.axisLabel('Factor Index');
          yAxis.axisLabel('Intensity');
          yAxis.tickFormat((y) => y.toFixed(3));
          yDomain([0, 2]);

          tooltip.contentGenerator(({point: {y, occurrences}, series: [serie]}) => {
            app.highlightedBehaviors = occurrences;
            let output = `<p style="border-bottom: 2px solid ${serie.color}">${serie.key}: ${y}</p>`;

            output += occurrences
              .slice(0, 10)
              .reduce((accumulator, {name}) =>  accumulator + `<p>${name}</p>`, '')

            output += `<br /><p>Total Behaviors: ${occurrences.length}</p>`;
            return `<div style="padding: 0.5em; text-align: left;">${output}</div>`;
          });
        }
      });

      return {graphs: [{data, meta, type: 'scatter'}]};
    }
  }
}));

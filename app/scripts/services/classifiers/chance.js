// Implementation of https://workflowy.com/#/1866981390e0
'use strict';

/**
 * The chance classifier predicts the chance of a trigger occurring in a given
 * context
 *
 * Currently it uses:
 * - the amount of a persons motivation
 * - the amount of a behavior simplicity
 * To predict the probability of a trigger occurring for a specific behavior
 *
 * @type {Object}
 */
Classifier.add(stampit({
  init () { this.stage() },
  props: {
    training: {log: 100, iterations: 1000},
  },
  refs: {
    name: 'chance',

    stage({training, relearn = true} = {}) {
      const {Architect}   = synaptic;
      this.network = new Architect.LSTM(3, 5, 3, 1);

      ['Triggering', 'Simplicity', 'Motivation'].forEach((name, index) => {
        this.network.layers.input.list[index].label = name;
      });
      ['Chance'].forEach((name, index) => {
        this.network.layers.output.list[index].label = name;
      });

      this.simplicity = Classifier.simplicity || Classifier.get('simplicity');
      this.motivation = Classifier.motivation || Classifier.get('motivation');
      this.sensation  = Classifier.sensation  || Classifier.get('sensation');
      this.training   = Object.assign(this.training, training);
      this.learned    = null;
    },

    _createMapper(occurrences) {
      const {motivation} = this;
      return {
        input(occurrence) {
          return [
            occurrence.features.sensation.actual,
            // TODO get learning from occurrence instead of simplicity prediction
            ss.min(occurrence.simplicity(true, 'actual')),
            // TODO get data from occurrence features, motivation method getter
            motivation.activate(occurrence.motivation(true, 'actual'))[0]
          ];
        },
        output(occurrence) {
          return [occurrence.features.chance.actual];
        }
      };
    },

    // TODO Treat learning of already started behaviors but unfinished
    learnableSet(occurrences) {
      const statuses = ['complete', 'cancel'];
      return occurrences.filter((occurrence) => {
        const {features: {chance}, status} = occurrence;

        if (!isFinite(chance.actual)) {
          this.discard(occurrence, `non finite actual chance ${chance.actual}`);
          return false;
        }

        if (!statuses.includes(status)) {
          this.discard(occurrence, `status ${status} is not acceptable (${statuses.join(', ')})`);
          return false;
        }

        return true;
      });
    },

    async learn (occurrences) {
      await this.simplicity.learn(occurrences);
      await this.motivation.learn(occurrences);

      const mapper = this._createMapper(occurrences);

      const set = this.learnableSet(occurrences)
        .map((occurrence) => {
          return {
            input : mapper.input(occurrence),
            output: mapper.output(occurrence)
          };
        });

      return this._train(set, this.training);
    },

    async predict (behaviors, {context}) {

      const predictions = await Promise.all([
        this.sensation.predict(behaviors, {context}),
        this.motivation.predict(behaviors, {context}),
        this.simplicity.predict(behaviors, {context})
      ]);

      behaviors.forEach( ({features}) => {
        features.chance.estimated = this.activate([
          features.sensation.estimated,
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
          'features.simplicity.estimated',
          'features.sensation.estimated'
        ])
        .map((occurrence, index) => {
          const {features: {sensation, simplicity, motivation, chance}} = occurrence;
          return [{
            occurrence,
            kind: 'predicted sensation',
            x: index, y: sensation.estimated || 0
          }, {
            occurrence,
            kind: 'predicted simplicity',
            x: index, y: simplicity.estimated || 0
          }, {
            occurrence,
            kind: 'predicted motivation',
            x: index, y: motivation.estimated || 0
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
        title: "Chance of triggering",
        options({xAxis, yAxis, yDomain, tooltip}, chart) {
          xAxis.axisLabel('Factor Index');
          yAxis.axisLabel('Intensity');
          yAxis.tickFormat((y) => y.toFixed(3));
          yDomain([0, 2]);

          tooltip.contentGenerator(({point: {x, y, occurrences}, series: [serie]}) => {
            app.highlightedBehaviors = occurrences;
            let output = `<p style="border-bottom: 2px solid ${serie.color}">${serie.key}: ${y}`;
            output += `<br /> Index: ${x}</p>`;

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

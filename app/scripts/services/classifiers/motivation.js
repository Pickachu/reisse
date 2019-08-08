'use strict'

Classifier.add(stampit({
  init () { this.stage() },
  props: {
    training: {log: 2, rate: 0.2, iterations: 10}
  },
  refs: {
    name: 'motivation',
    stage({training, relearn = true} = {}) {
      const {Architect} = synaptic;

      this.network      = new Architect.LSTM(3, 6, 6, 1);

      ['Sensation', 'Anticipation', 'Belongness'].forEach((name, index) => {
        this.network.layers.input.list[index].label = name;
      });
      ['Motivation'].forEach((name, index) => {
        this.network.layers.output.list[index].label = name;
      });

      this.anticipation = Classifier.anticipation || Classifier.get('anticipation');
      this.sensation    = Classifier.sensation    || Classifier.get('sensation');
      this.training     = Object.assign(this.training, training);
      this.learned      = null;
    },
    /**
     * TODO use simplicity of daytime to validate minimum motivation required
     * if a task is X in simplicity, it requires at least inverseBjFoggConceptualCurve(x) motivation
     * TODO Treat already started behaviors
     *
     * @param  {Behavior[]}  behaviors [description]
     *
     * @return {Promise}  the default learning object from classifier classes
     */
    async learn(behaviors) {

      const set = this.learnableSet(behaviors)
        .map((behavior) => behavior.motivation(true, 'actual'))
        .map((factors) => ({
          input: factors,
          output: [ss.average(factors)]
        }));

      return this._train(set, this.training);
    },
    async predict(behaviors, {context}) {
      const sensations = await this.sensation.predict(behaviors, {context});
      const anticipations = await this.anticipation.predict(behaviors, {context});

      behaviors.forEach((behavior, index) => {
        behavior.features.sensation.estimated    = sensations[index];
        behavior.features.anticipation.estimated = anticipations[index];
      });

      behaviors.forEach((behavior) => {
        behavior.features.motivation.estimated = this.network.activate(behavior.motivation(true, 'truer'))[0];
      });
    },

    async performate (behaviors, options = {}) {
      this.stage(options.stage);

      // TODO better integration of Re estimatives
      const estimated = await Re.estimate(behaviors, app.areas.concat());
      const factors = ['sensation', 'anticipation', 'belongness', 'predicted motivation'];
      const performatable = this.performatableSet(estimated);
      const learning = await this.learn(performatable);
      const context = await Context().for(new Date());
      await this.predict(performatable.filter(({status}) =>
        status === 'open'
      ), {context});

      const data = _(performatable)
        .filter(({status}) => status !== 'cancel')
        .map((behavior) => behavior.motivation(true, 'truer').concat(behavior.features.motivation.estimated || 0))
        .flatten()
        .map((input, index) => ({
          x: index % factors.length, y: parseFloat(input.toFixed(3)),
          behavior: performatable[Math.floor(index / factors.length)]
        }))
        .groupBy('x')
        .map((group, index) => {

          const values = _(group)
            .groupBy('y')
            .map((subgroup) => ({
              x: subgroup[0].x, y: parseFloat(subgroup[0].y),
              size: subgroup.length,
              behaviors: subgroup.map(({behavior}) => behavior)
            }))
            .value();

          return {key: _.upperFirst(factors[+index]), values};
        })
        .value();

      const meta = Object.assign({}, learning, {
        title: "Motivation Factors",
        options({xAxis, yAxis, tooltip}, chart) {
          chart.height = 1000;
          xAxis.axisLabel('Factor Index');
          xAxis.tickFormat((index) => factors[index]);
          yAxis.axisLabel('Intensity');
          yAxis.tickFormat((y) => y.toFixed(3));

          tooltip.contentGenerator(({point: {y, behaviors}, series: [serie]}) => {
            let output = `<p style="border-bottom: 2px solid ${serie.color}">${serie.key}: ${yAxis.tickFormat()(y)}</p>`;
            output += `<p>Total Behaviors: ${behaviors.length}</p> <br />`;

            output += behaviors
              .slice(0, 10)
              .reduce((accumulator, {name}) =>  accumulator + `<p>${name}</p>`, '')

            app.highlightedBehaviors = behaviors;

            return `<div style="padding: 0.5em; text-align: left;">${output}</div>`;
          });
        }
      });
      return {graphs: [{data, meta, type: 'scatter'}]};
    }
  }
}));

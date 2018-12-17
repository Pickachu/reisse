'use strict'

Classifier.add(stampit({
  init () { this.stage() },
  refs: {
    name: 'simplicity',

    stage () {
      this.routine = Classifier.get('routine');
    },

    async learn(behaviors) {
      return this.routine.learn(behaviors);
    },

    // TODO add contextual simplicity prediction
    async predict(behaviors, {context}) {
      await this.routine.predict(behaviors, {context});

      behaviors.forEach((behavior) => {
        let estimated = ss.min(behavior.simplicity(true, 'truer'));
        behavior.features.simplicity.estimated = estimated;
      });

      return behaviors;
    },

    async performate (behaviors) {
      this.stage();

      // TODO better integration of Re estimatives
      const estimated = await Re.estimate(behaviors, app.areas.concat());
      const factors = ['money', 'time', 'cycles', 'effort', 'commonality', 'simplicity'];
      const learnable = this.performatableSet(estimated);
      const data = _(learnable)
        .map((behavior) => {
          let factors = behavior.simplicity(true, 'truer');

          // TODO use this.predict method
          factors.push(ss.min(factors));
          return factors;
        })
        .flatten()
        .map((input, index) => ({
          x: index % factors.length, y: parseFloat(input.toFixed(3)),
          behavior: learnable[Math.floor(index / factors.length)]
        }))
        .groupBy('x')
        .map((group, index) => {
          let values = _(group)
            .groupBy('y')
            .map((subgroup) => ({
              x: subgroup[0].x, y: parseFloat(subgroup[0].y),
              size: subgroup.length,
              behaviors: subgroup.map(({behavior}) => behavior)
            }))
            .value()

          return {key: _.upperFirst(factors[+index]), values};
        })
        .value();

      const meta = {
        title: "Simplicity Factors",
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
      };
      return {graphs: [{data, meta, type: 'scatter'}]};
    }
  }
}));

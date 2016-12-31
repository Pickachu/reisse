'use strict'

Classifier.add(stampit({
  refs: {
    name: 'simplicity'
  },
  init () { this.stage() },
  methods: {
    predict(behaviors) {
      behaviors.forEach((behavior) => {
        let estimated = ss.min(behavior.simplicity(true, 'truer'))
        behavior.features.simplicity.estimated = estimated;
      });

      return Promise.resolve(behaviors);
    },
    performate (behaviors) {
      let learnable;

      this.stage();

      // TODO better integration of Re estimatives
      return Re.estimate(behaviors, app.areas.concat())
        .then((estimated) => {
          let factors = ['money', 'time', 'cycles', 'effort', 'commonality', 'simplicity'];
          learnable   = this.performatableSet(estimated);

          let data = _(learnable)
            .map((behavior) => {
              let factors = behavior.simplicity(true, 'truer')
              factors.push(ss.min(factors))
              return factors;
            })
            .flatten()
            .map((input, index) => ({x: index % 6, y: parseFloat(input.toFixed(2))}))
            .groupBy('x')
            .map((group, index) => {
              let values = _(group)
                .groupBy('y')
                .map((subgroup) => ({x: subgroup[0].x, y: parseFloat(subgroup[0].y), size: subgroup.length}))
                .value()

              return {key: _.upperFirst(factors[+index]), values: values};
            })
            .value();

          let meta = { title: "Simplicity Factors" };
          return {graphs: [{data: data, meta: meta, type: 'scatter'}]};
        });
    }
  }
}));

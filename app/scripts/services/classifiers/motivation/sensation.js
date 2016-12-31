'use strict';

// TODO use homeostasis classifier?
// TODO use cicardian classifier?
Classifier.add(stampit({
  refs: {
    name: 'sensation'
  },
  init () {
    // TODO use anticipation classifier
    // TODO better way to reuse ResponsibilityArea estimator classifier
    this.sleepiness = estimators.sensation.sleepiness || Classifier.get('sleepiness');
    this.hunger     = estimators.sensation.hunger     || Classifier.get('hunger');
  },
  methods: {
    predict(behaviors) {
      let predictions, finite = Number.isFinite, sleepiness ;

      predictions = behaviors.map((behavior) => {
        let features   = behavior.features,
          activityType = behavior.activity && behavior.activity.type,
          sleepiness   = features.sleepiness.truer,
          hunger       = features.hunger.truer,
          sensation;

        if (behavior.status === 'open') {
          if (!finite(sleepiness)) { sleepiness = this.context.sleepiness; }
          if (!finite(hunger)    ) { hunger     = this.context.hunger; }
        }

        // TODO think how to create a rule based system to set the relationship between
        // features and activity types or just use a perceptron here
        switch (activityType) {
          case 'sleep':
          case 'nap':
            sensation = Math.min((0 + sleepiness + 1 - hunger) / 2, 0);
            break;
          case 'meal':
            sensation = Math.min((1 - sleepiness + 0 + hunger) / 2, 0);
            break;
          default:
            sensation = Math.min((1 - sleepiness + 1 - hunger) / 2, 0);
            break;
        }

        return sensation;
      });

      return Promise.resolve(_.flatten(predictions));
    },
    performate (behaviors) {
      let learnable;

      this.stage();

      // TODO better integration of Re estimatives
      return Re.estimate(behaviors, app.areas.concat())
        .then((estimated) => {
          let data = [
            {key: 'sleepiness', values: [] },
            {key: 'hunger'    , values: [] },
            {key: 'sensation' , values: [] }
          ];

          estimated = estimated.filter((o, i, bs) => i > (0.95 * bs.length))

          return this.predict(estimated)
            .then((predictions) => {
              estimated.map((behavior, index) => {
                let features = behavior.features,
                sleepiness = features.sleepiness.truer,
                hunger     = features.hunger.truer;

                return [sleepiness, hunger, predictions[index]];
              })
              .sort((a, b) => a[2] - b[2])
              .forEach((sensation, index) => {
                data[0].values.push({x: index, y: sensation[0]});
                data[1].values.push({x: index, y: sensation[1]});
                data[2].values.push({x: index, y: sensation[2]});
              });

              meta = {
                title: 'Sensation By Phisiology',
                options: {
                  axis: {
                    x: {axisLabel: 'Sensation Token'},
                    y: {axisLabel: 'Sensation Intensity'}
                  }
                }
              };

              return {graphs: [{data: data, type: 'scatter', meta: meta}]};
            });
        });
    }
  }
}));

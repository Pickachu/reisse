'use strict';

/**
 * The sensation motivation factor is the amount of pleasure/pain that a person
 * will immediately or nearly immediately will receive when performin the behavior
 *
 * TODO use homeostasis classifier?
 * TODO use cicardian classifier?
 * TODO use anticipation classifier? (why?)
 * @type {Object}
 */
Classifier.add(stampit({
  init () { this.stage(); },
  refs: {
    name: 'sensation',
    // learn(): Uses default learning method from Classifier stamp the learn method does nothing
    async predict(behaviors, {context} = {}) {
      const predictions = behaviors.reduce((predictions, behavior) => {
        let {features}   = behavior,
          activityType = behavior.activity && behavior.activity.type,
          sleepiness   = features.sleepiness.truer,
          hunger       = features.hunger.truer;

        let sensation;

        if (behavior.status === 'open') {
          if (!isFinite(sleepiness)) { sleepiness = context.sleepiness || 0.5; }
          if (!isFinite(hunger)    ) { hunger     = context.hunger     || 0.5; }
        }

        // TODO think how to create a rule based system to set the relationship between
        // features and activity types or just use a perceptron here
        switch (activityType) {
          // Sleep activities are high in pleasure when the person is sleepy
          case 'sleep':
          case 'nap':
            sensation = Math.max((0 + sleepiness + 1 - hunger) / 2, 0);
            break;
          // Meal activities are high in pleasure when the person is hungry
          case 'meal':
            sensation = Math.max((1 - sleepiness + 0 + hunger) / 2, 0);
            break;
          default:
          // Other activities are low in pleasure when the person is hungry or sleepy
            sensation = Math.max((1 - sleepiness + 1 - hunger) / 2, 0);
            break;
        }

        // Explosive sensation value was computed
        if (sensation > 1 || sensation < 0 || !isFinite(sensation)) { debugger }

        return predictions.concat(sensation);
      }, []);

      return predictions.flat();
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

          // FIXME better mocking of contexts
          const context = {sleepiness: 0.5, hunger: 0.5};

          estimated = estimated.filter((o, i, bs) => i > (0.95 * bs.length))

          return this.predict(estimated, {context})
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

              let meta = {
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

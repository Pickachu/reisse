'use strict';

// TODO Calculate neural net accuracy
Classifier.add(stampit({
  init() {
    // FIXME forwardable properties to reisse classifiers
    this.areas || (this.areas = app.areas);
    this.stage();
  },
  refs: {
    name: 'duration',
    stage () {
      let Architect   = synaptic.Architect;
      // this.perceptron = new Architect.LSTM(35, 6, 8, 6, 1);
      this.areaIds = this.areas.map((area) => area.provider.id);
    },
    learn(behaviors) {
      let dict = new Map();

      _(behaviors)
        .filter((behavior) => {
          if (!behavior.name) return this.skips.push(behavior), false;
          const {duration} = behavior.features;
          if (!isFinite(duration.actual)) return this.discard(behavior, 'invalid duration'), false;
          if (duration.actual < 0) return this.discard(behavior, 'negative duration'), false;
          if (duration.actual < 1000) {
            console.warn('[classifier.duration::learn] behavior with minuscle duration detected', behavior.name, behavior.provider.name, behavior);
          }
          // FIXME slice ocurrence with ginormous duration on estimators?
          if (duration.actual > 24 * 60 * 60 * 1000) {
            console.warn('[classifier.duration::learn] behavior with ginormous duration detected', behavior.name, behavior.provider.name, behavior);
            return this.discard(behavior, 'ginormous duration'), false;
          }
          return true;
        })
        .map((behavior) => {
          const {duration} = behavior.features;

          mimir.tokenize(behavior.name).forEach((token) => {
            let durations;
            if (dict.has(token)) {
              durations = dict.get(token);
            } else {
              durations = [];
              dict.set(token, durations);
            }

            durations.push(duration.actual);
          });

          return behavior;
        })
        .tap((behaviors) => {
          dict.forEach((durations, token) => {
            dict.set(token, ss.average(durations));
          });

          // TODO update tokenizator to consider emojis
          dict.delete("");

          // TODO update tokenizator to consider R$
          dict.delete("r");

          this.durationByToken = dict;
        })
        .value();

      if (this.skips.length > 0) {
        let message = '[classifier.duration::learn]';
        message += ` ${this.skips.length} of ${behaviors.length} behaviors `;
        message += 'were skip due to missing name, invalid actual duration (negative, minuscle or ginormous).'
        console.warn(message);
      }

      return Promise.resolve({sampleSize: behaviors.length, iterations: 1});
    },
    async predict(behaviors) {
      let total = behaviors.length;

      behaviors
        .filter(({name}) => Boolean(name))
        .forEach((behavior, index, behaviors) => {
          let durations = _.compact(mimir.tokenize(behavior.name).map((token) => this.durationByToken.get(token)));
          if (!durations.length) durations = [0];

          if (!(index % 2500)) {
            console.log('predicting duration', index, `of ${behaviors.length} (${total})`, '\nSample:', behavior.name, 'Predicted Duration:', moment.duration(ss.average(durations)).asSeconds());
          }
          behavior.features.duration.estimated = ss.average(durations);
        });

      return behaviors;
    },

    // TODO let duration prediction to 60% accuracy
    async performate (behaviors) {
      this.stage();

      const performatable = behaviors.map(Ocurrence.fromJSON, Ocurrence);

      const estimator = Estimator.get('duration');
      const learnable = await estimator.estimate(performatable);
      const learning = await this.learn(learnable);
      await this.predict(performatable);

      const graphable = _(performatable)
        .filter(({features}) => features && isFinite(features.duration.estimated))
        .sortBy(['status', 'features.duration.estimated', 'features.duration.actual'])
        .value()

      const data = _(graphable)
        .map(({name, features: {duration}, status}, index) => ({
            predicted: duration.estimated,
            actual: duration.actual, status
          })
        )
        .reduce((columns, {predicted, actual}, index) => {
          columns[0].values.push({
            x: index,
            y: predicted
          });

          columns[1].values.push({
            x: index,
            y: actual || 0
          });

          return columns;
        }, [{key: 'Predicted Duration', values: []}, {key: 'Actual Duration', values: []}])

      learning.sampleSize = data[1].values.length;

      return {
        graphs: [{
          data,
          meta: Object.assign({
              title: 'Token Durations',
              // Preseve parent scope
              options: (model) => {
                const toMinutes = (value) => (value / (60 * 1000)).toFixed(0) + 's';
                model.stacked(false);
                model.xAxis.axisLabel('Behavior Index');
                model.yAxis.axisLabel('Behaviour Duration');
                model.yAxis.tickFormat(toMinutes);
                if (!model.yDomain()) model.yDomain([0, 6 * 60 * 60 * 1000]);
                model.interactiveLayer.tooltip.headerFormatter((index) => {
                  const behavior = graphable[index];
                  const tokens = _.compact(mimir.tokenize(behavior.name));

                  return tokens.reduce((header, token, tokenIndex) => {
                    if (tokenIndex % 5) header += '<br />';
                    return `${header} ${token} (${toMinutes(this.durationByToken.get(token))}), `;
                  }, `# ${index} - ${behavior.status} - ${behavior.name} <br /> <br /> Tokens: <br />`) + '<br />';
                });

              }
            }, learning),
          type: 'multi-bar'
        }]
      };
    },
    _createInputMapper (behaviors) {
      let classifier = this;

      return {
        areaIds: this.areaIds,
        areasLength: this.areas.length,
        maximumDuration: Feature.aggregates.maximums.duration_actual || 1,
        hasher: Hash.Sim,
        mappedSimilarityHash (string) {
          return this.hasher.createBinaryArray(this.hasher.simhash(string));
        },
        output(behavior) {
          let duration = behavior.features.duration, output = [];

          if (Number.isFinite(duration.actual)) {
            output.push(duration.actual / this.maximumDuration)
          }

          if (output[0] > 1) {
            console.warn("Invalid normalization for behavior! Will normalize to 1");
            output[0] = 1;
          }

          return output;
        },
        input(behavior) {
          let input = [];

          if (behavior.start) {
            input.push(behavior.start.getHours() / 23);
          } else {
            input.push(0.5);
          }

          if (behavior.end) {
            input.push(behavior.end.getHours() / 23);
          } else {
            input.push(0.5);
          }

          input.push(this.areaIds.indexOf(behavior.areaId) / this.areasLength);

          input = input.concat(this.mappedSimilarityHash(behavior.name || ''));
          if (input[1] > 1 || input[1] < 0) {
            throw new TypeError("Invalid input normalization");
          }
          return input;
        },
        denormalize(output) {
          return output[0] * this.maximumDuration
        }
      };
    }
  }
}));

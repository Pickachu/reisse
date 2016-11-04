'use strict'

// TODO group task on daytime by meaning instead of by distributed frequency to infer anticipation motivation and simplicity
// It currently yields:
// - a 10% prediction success for random assignment
// - a 15% prediction success for hour
// - a 35% prediction success for day period (morning, night, afternoon, madrugada)
let DaytimeStamp = stampit({
  init() {
    // let Architect   = synaptic.Architect;
    //
    // this.perceptron = new Architect.Perceptron(6, 3, 1);
    // this.perceptrons   = {};

    return this;
  },
  methods: {
      toShortNames (text) {
        return text.replace(this.emojis, (emoji) => {
          let code, key = '';

          if (!emoji.length) return console.warn('toShortNames: empty emoji match.');

          for (let i = 0, j = emoji.length; i < j; i++) {
            key += emoji.charCodeAt(i).toString(16) + '-';
          }
          key = key.slice(0, -1);

          return this.shortnames[key];
        });
      },

      learn(behaviors) {
        let sets, documents, groups, Architect = synaptic.Architect,  distributions;

        this.distributions = _(behaviors)
          // Group behaviors by 1 of the 24 hours of the day
          .groupBy((behavior)    => behavior.completedAt.getHours()                )
          // Store grouped behaviors by hour for later usage
          .tap((unescoped)       => groups = unescoped                             )
          // Create distribution hour frequency map
          .mapValues((group)     => {
            let documents = [], distribution;

            distribution = _(group)
              // Transform behaviors in documents getting the name of the task (behavior)
              .map('name')

              // Replace emoji for short names
              .map(this.toShortNames, this)

              // Store documents for future reference
              .tap((unescoped) => documents = unescoped)

              // Tokenize documents in to words
              .map(mimir.tokenize)

              // Calculate tfidf foreach token in each document
              .reduce((storage, tokens, index) => {

                tokens.forEach((token) => {
                  let frequencies = storage.get(token) || [];

                  // mimir tokenize returns empty string sometimes
                  // TODO why?
                  if (!token) return;

                  frequencies.push(mimir.tfidf(token, documents[index], documents));
                  storage.set(token, frequencies);
                });

                return storage;
              }, new Map());

            distribution.forEach((frequencies, token) => {
              // frequencies storage => distribution
              distribution.set(token, ss.average(frequencies));
            });

            return distribution;
          })
          // Map each relevance distribution to an especific day hour
          .reduce((distributions, distribution, hour) =>
            distributions.set(hour, distribution), new Map()
          );
          // .mapValues((documents) =>
          //   mimir.tokenize(documents[index])
          //
          //
          //   let perceptron, classes;
          //   // let factors = behavior.simplicity(true, 'actual');
          //   documents.forEach((document, index) => {
          //     .forEach((word) => {
          //       classes[hour]       = [];
          //       classes[hour][word] =
          //     });
          //   });
          //
          //
          //   this.perceptrons[hour] = perceptron;
          // });
      },
      predict(behaviors) {

          behaviors.forEach((behavior) => {
            let tokens = mimir.tokenize(this.toShortNames(behavior.name)), best = {certainty: 0};

            // lodashify
            this.distributions.forEach((distribution, hour) => {
              let probabilities = [], certainty;

              tokens.forEach((token) => {
                let probability = distribution.get(token) || 0.5;
                if (probability) {
                  probabilities.push(probability);
                }

              });

              certainty = ss.average(probabilities);
              if (certainty > best.certainty) {
                best.hour      = hour
                best.certainty = certainty
              }
            });

            behavior.predictedHour = best
            console.log(hours);
          });
      }
  },
  static: {
    createTokenizationMap() {
      let shortnames = {}, keyFor = function(unicode) {
        var parts = [], s, hi, lo;
        if(unicode.indexOf("-") > -1) {
            s = unicode.split('-');
            for(var i = 0; i < s.length; i++) {
                var part = parseInt(s[i], 16);
                if (part >= 0x10000 && part <= 0x10FFFF) {
                    hi = Math.floor((part - 0x10000) / 0x400) + 0xD800;
                    lo = ((part - 0x10000) % 0x400) + 0xDC00;
                    parts.push(hi);
                    parts.push(lo);
                }
                else {
                    parts.push(part);
                }

            }
        } else {
            s = parseInt(unicode, 16);
            if (s >= 0x10000 && s <= 0x10FFFF) {
                hi = Math.floor((s - 0x10000) / 0x400) + 0xD800;
                lo = ((s - 0x10000) % 0x400) + 0xDC00;
                parts.push(hi);
                parts.push(lo);
            }
            else {
                parts.push(s);
            }
        }

        return parts.map((n) => n.toString(16)).join('-');
      };

      // FIXME emojione update breaked this code, figure out why
      // _.each(emojione.emojioneList, (codes, shortname) => {
      //   codes.forEach((code) => shortnames[keyFor(code)] = shortname.replace(/:/g, ''));
      // });

      return {shortnames: shortnames};
    }
  },
  refs: {
    // FIXME Stop ignoring UTF-16 signatures! Use emojione unicodeRegexp to generate a good regexp
    // TODO erase second member of regex [\u25AA] when adding UTF-16 support
    emojis: /([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u25AA-\u26FD][.])/g,
    name: 'daytime'
  }
});

Classifier.add(DaytimeStamp.refs(DaytimeStamp.createTokenizationMap()));

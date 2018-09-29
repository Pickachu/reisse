'use strict';

window.Lore || (window.Lore = stampit())

/**
 * Lore.integrable composable
 *
 * Mainly to instantiate and run integrations
 *
 * Tip: For a fast try on a integration run:
 *
 * name = 'rescue-time';
 * range = [moment().subtract(1, 'day'), moment()];
 * let [since, until] = range;
 * integration = Lore.integrations.find(({name: other, fixed}) => {
 *   if (other && other !== 'Factory') return other === name;
 *   else if (fixed) return fixed.refs.name === name;
 *   else throw new TypeError(`bad integration declaration for ${name}`);
 * });
 *
 * if (!integration) throw new TypeError(`no integration named ${name}`);
 *
 * attributes = { since, until };
 * instance = (integration.fixed) ? integration(attributes) : Object.assign(integration, attributes);
 * integrable = Lore();
 *
 * await instance.populate(integrable);
 *
 * @type {stamp}
 */
Lore = Lore.static({
  integrable: stampit({
    props: {
      servings: {}
    },
    methods: {
      // Distribute data into a consistent model
      integrations(until) {
        return new Promise((integrated, failed) => {
          if (!this.synchronizedAt) throw new TypeError("Lore.integrations: Cannot run integrations without last sync date.");

          const updates  = Lore({synchronizedAt: this.synchronizedAt});
          const since    = this.synchronizedAt;
          const resolver = this.createDependencyResolver();
          const promises = Lore.integrations
            .map((integration) => {
              const attributes = { since, until, when: resolver.when.bind(resolver)};
              return (integration.fixed) ? integration(attributes) : Object.assign(integration, attributes);
            })

            // Will skip integration services that did not exist before the requested date
            .filter(({minimunSince}) => minimunSince < since)

            // Effetively start instance data download and integration
            .map((instance) => {
              const serving = instance.populate(updates);
              resolver.register(instance.name, serving);
              return serving;
            });

          resolver.resolve();

          Promise.all(promises).then(() => {
            console.log('Lore.integrations: start changes computation.\n');

            const batch = this._computeFirebaseChanges(updates);
            batch.synchronizedAt = until.getTime();

            console.log('Lore.integrations: finished changes computation');
            integrated(batch);
          }, failed);
        });
      },
      createDependencyResolver() {
        let resolve;
        const blocking = new Promise((r) => resolve = r);

        return {
          resolve,
          servings: {},
          register(name, promise) {
            this.servings[name] = promise;
          },
          when (...names) {
            return blocking.then(() => {
              return Promise.all(names
                .map((name) => {
                  if (!this.servings[name]) throw new TypeError(`The serving for integration ${name} does not return a promise or does not exist.`);
                  return this.servings[name];
                })
              ).then((resolutions) => Promise.resolve(resolutions.pop()));
            });
          }
        };
      },
    }
  })
});

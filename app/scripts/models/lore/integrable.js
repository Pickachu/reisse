'use strict';

window.Lore || (window.Lore = stampit())

Lore = Lore.static({
  integrable: stampit({
    props: {
      servings: {}
    },
    methods: {
      // Distribute data into a consistent model
      integrations(until) {
        console.error('remove default status hardcoded on ocurrence.js');

        return new Promise((integrated, failed) => {
          let updates = Lore({synchronizedAt: this.synchronizedAt}),
          batch, promises = [], serve;

          if (!this.synchronizedAt) throw new TypeError("Lore.integrations: Cannot run integrations without last sync date.");

          Lore.integrations.forEach((integration) => {
            let serving;

            if (integration.minimunSince < this.synchronizedAt) {
              integration.since = this.synchronizedAt;
              integration.until = until;
              integration.when  = this.when.bind(this);

              serving = integration.populate(updates);

            // Skip integration services that did not exist before the requested date
            } else {
              serving = Promise.resolve([]);
            }

            this.servings[integration.name] = serving;
            promises.push(serving);
          });

          Promise.all(promises).then(() => {
            console.log('Lore.integrations: start changes computation.\n');

            batch = this._computeFirebaseChanges(updates);
            batch.synchronizedAt = until.getTime();

            console.log('Lore.integrations: finished changes computation');
            integrated(batch);
          }, failed);
        });
      },
      when (name) {
        if (!this.servings[name]) throw new TypeError(`The serving for integration ${name} does not return a promise or does not exist.`);
        return this.servings[name];
      }
    }
  })
});

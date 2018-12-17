'use strict';

import('./relisse/rulesetable.js').then(({default: ruleSetable}) => {

  Lore.integrations.add({
    refs: {
      name: 'relisse',
      minimunSince: new Date(0),

      // TODO make resonsiblities configurable
      responsibilities: ['self-care', 'work', 'learning', 'fun'],
      providers: ['things', 'asana', 'jawbone'],

      ruleSetable,

      async populate (lore) {
        // await this.when('things', 'asana', 'jawbone', 'i-calendars');
        const settings = await this.__fetchUserSettings();
        return this._integrateAreas(lore, settings);
      },

      _integrateAreas (lore, settings) {
        settings.ruleSets
          .map((rules) => this.ruleSetable({rules}))
          .forEach((ruleSet) => {
            ruleSet.evaluate({lore})
          });

        // Verify areas for mandatory responsibilities
        this.responsibilities.forEach((responsibility) => {
          const exists = lore.areas.find(({responsibilities}) => responsibilities.includes(responsibility));
          if (!exists) {
            let message = `[integrations.relisse::_integrateAreas] no area bound to mandatory responsibility ${responsibility}.`;
            message += `\n please create a rule to bind this responsibility to some area.`;
            console.error(message);
          }
        });
      },

      // TODO formalize client access and database access for integrations
      // probably on synchronizerable
      async __fetchUserSettings() {
        // TODO get firebase user id, firebase.getAuth()
        const userId = 'me';
        const location = `https://boiling-fire-6466.firebaseio.com/users/${userId}/settings/integrations/${this.name}`;
        return new Promise(function(resolve, reject) {
          new Firebase(location)
            .once('value', (snapshot) => resolve(snapshot.val()))
            .catch(reject);
        });
      },

      _timeAwareFilter (ocurrences) {
        let classify = (entry) => {
          if (!entry.updatedAt || typeof entry.updatedAt === 'string') console.warn("Invalid or no modification date found for entry, will ignore sync for: ", entry.name)
          return entry.updatedAt > this.since && entry.updatedAt < this.until;
        };

        return ocurrences.filter(classify);
      }
    }
  });

});

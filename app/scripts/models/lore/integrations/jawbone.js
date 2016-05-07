'use strict';

Lore.integrations.push(
  Lore.Integration({
    name: 'jawbone',
    minStartTime: new Date(2013, 8),
    populate (lore) {
      console.log('service', this.name, 'start download');
      return new Promise((served) => {
        let provider = document.querySelector('jawbone-element'), since = this.since,
          listener = (event) => {
            console.log('service jawbone finish download');
            let ocurrences  = provider.data.map(Activity.fromJawbone, Activity).map(lore.assignArea, lore);
            lore.ocurrences = lore.ocurrences.concat(ocurrences);

            provider.removeEventListener('populated', listener);
            served();
          };

        provider.addEventListener('populated', listener);

        if (this.since < this.minStartTime) {
          since = this.minStartTime
        }

        provider.endTime   = new Date();
        provider.startTime = since;
        // provider.startTime = new Date(2013, 8);
        // TODO implement pagination!
        provider.limit     = 2000;
      });
    }
  })
);

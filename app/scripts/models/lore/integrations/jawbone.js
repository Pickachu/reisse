'use strict';

Lore.integrations.push(
  Lore.Integration({
    name: 'jawbone',
    // Parse date to avoid timezones
    minimunSince: new Date(Date.parse('2013-09-01')),
    populate (lore) {
      console.log('service', this.name, 'start');
      return new Promise((served) => {
        let provider = document.querySelector('jawbone-element'), since = this.since,
          listener = function (event) {
            console.log('service jawbone finish', this.collectionName);
            let ocurrences  = this.data.map(Activity.fromJawbone, Activity).map(lore.assignArea, lore);
            lore.ocurrences = lore.ocurrences.concat(ocurrences);

            if (this.collectionName != 'meals') {
              this.collectionName = 'meals'
            } else {
              this.removeEventListener('populated', listener);
              served();
            }
          };

        provider.addEventListener('populated', listener);

        provider.startTime = new Date(Math.max(this.minimunSince, this.since));
        provider.endTime   = this.until;
        // provider.startTime = new Date(2013, 8);
        // TODO implement pagination!
        provider.limit     = 2000;

        provider.collectionName = 'sleeps'
      });
    }
  })
);

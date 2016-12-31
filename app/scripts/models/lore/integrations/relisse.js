'use strict';

Lore.integrations.add({
  refs: {
    name: 'relisse',
    responsibilities: ['self-care', 'work'],
    providers: ['things', 'asana', 'jawbone']
  },
  methods: {
    populate (lore) {
      return this.when('things', 'asana', 'jawbone').then(() => {
        // TODO configurable responsibility_areas
        let workArea  = lore.areas.find((area) => area.provider.id == '9753CADC-C398-43C3-B822-5BD83795070D');
        if (!workArea.responsibilities.includes('work')) workArea.responsibilities.push('work');

        this._integrateAreas(lore);
        return Promise.resolve(true);
      })
    },

    _integrateAreas (lore) {
      // Mandatory responsibilities
      let mandatory  = this.responsibilities;

      // Create areas for mandatory responsibilities
      mandatory.forEach((responsibility) => {
        let exists = lore.areas.find((area) => area.responsibilities.includes(responsibility));
        if (!exists) {
          lore.areas.push(Area({
            name: 'Self Care',
            provider: {
              // TODO better way to generate a temporary id
              id: (Math.random() * 10000).toFixed(),
              name: 'relisse'
            },
            tagNames: "",
            responsibilities: [responsibility],
            suspended: false
          }));
        }
      });

      // TODO let each integration define witch responsibility each task belongs to
      let map = this._buildProviderResponsibilityMap(lore);
      lore.ocurrences
        .filter((o) => !o.areaId)
        .forEach((o) => o.areaId = map.get(o.provider.name))
    },

    _buildProviderResponsibilityMap(lore) {
      let map = new Map(), links = {
        'work'     : 'asana',
        'self-care': 'jawbone'
      };

      this.responsibilities.forEach((responsibility) => {
        let area = lore.areas.find((area) => area.responsibilities.includes(responsibility));
        if (area) {
          if (!links[responsibility]) return console.error(`No provider defined for responsibility ${responsibility}.`, links);
          map.set(links[responsibility], area.provider.id);
        } else {
          console.error(`No area defined for ${responsibility}!`);
        }
      });

      return map;
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

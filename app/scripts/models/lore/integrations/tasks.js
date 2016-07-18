'use strict';

Lore.integrations.push(
  Lore.Integration({
    name: 'things',
    minimunSince: new Date(Date.parse('2007')),
    populate (lore) {
      console.log('service', this.name);
      let provider = document.querySelector('things-element'),
          ocurrences = provider.todos.map(Task.fromThings, Task);

      // TODO move time filter to things-element
      ocurrences = this._timeAwareFilter(ocurrences);

      lore.areas      = provider.areas.map(Area.fromThings, Area);
      lore.ocurrences = lore.ocurrences.concat(ocurrences);
      // TODO: provider.projects.map(Project?.fromThings, Project);

      // TODO configurable responsibility_area
      lore.workArea   = lore.areas.find((area) => area.provider.id == '9753CADC-C398-43C3-B822-5BD83795070D');
      lore.healthArea = lore.areas.find((area) => area.provider.id == "2D101DED-2DC7-4EE5-B9CB-C164E0F775E9");

      return Promise.resolve(ocurrences);
    },

    _timeAwareFilter(ocurrences) {
      let classify = (entry) => {
        if (!entry.updatedAt || typeof entry.updatedAt === 'string') console.warn("Invalid or no modification date found for entry, will ignore sync for: ", entry.name)
        return entry.updatedAt > this.since && entry.updatedAt < this.until;
      };

      return ocurrences.filter(classify);
    }
  }),
  Lore.Integration({
      name: 'asana',
      minimunSince: new Date(Date.parse('2008')),
      populate (lore) {
        console.log('service', this.name, 'start download');
        return new Promise((served) => {
          let provider    = document.querySelector('asana-workspace'),
          integration     = this,
          listener        = function () {
            let ocurrences  = this.tasks.map(Task.fromAsana, Task);
            ocurrences      = integration._timeAwareFilter(ocurrences)
              .map(lore.assignArea, lore);

            lore.ocurrences = lore.ocurrences.concat(ocurrences);
            // TODO: provider.projects.map(Project?.fromAsana, Project);
            // TODO: provider.workspaces.map(Workspace?.fromAsana, Workspace?);
            provider.removeEventListener('populated', listener);
            console.log('service asana finish download');
            served(ocurrences);
          };

          provider.addEventListener('populated', listener);
          provider.limit = 100;

          // In order to prevent double loading every tasks, only load tasks before
          // the since date parameter
          if (!provider.modifiedSince || provider.modifiedSince > this.since) {
            provider.modifiedSince = this.since;
          } else {
            listener.call(provider);
          }
        });
      },

      _timeAwareFilter(ocurrences) {
        let classify = (entry) => {
          if (!entry.updatedAt || typeof entry.updatedAt === 'string') console.warn("Invalid or no modification date found for entry, will ignore sync for: ", entry.name)
          return entry.updatedAt > this.since && entry.updatedAt < this.until;
        };

        return ocurrences.filter(classify);
      }
  })
);

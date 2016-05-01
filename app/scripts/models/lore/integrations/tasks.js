'use strict';

Lore.integrations.push(
  Lore.Integration({
    name: 'things',
    populate (lore) {
      console.log('service', this.name);
      let provider = document.querySelector('things-element'),
          ocurrences = provider.todos.map(Task.fromThings, Task);

      lore.areas      = provider.areas.map(Area.fromThings, Area);
      lore.ocurrences = lore.ocurrences.concat(ocurrences);
      // TODO: provider.projects.map(Project?.fromThings, Project);

      lore.workArea   = lore.areas.find((area) => area.provider.id == '9753CADC-C398-43C3-B822-5BD83795070D');
      lore.healthArea = lore.areas.find((area) => area.provider.id == "2D101DED-2DC7-4EE5-B9CB-C164E0F775E9");

      // TODO move time filter to things-element
      this._timeAwareFilter(lore);
    },

    _timeAwareFilter(updates) {
      let synchronizedAt = updates.synchronizedAt, classify;

      classify = (entry) => {
        if (!entry.createdAt || typeof entry.createdAt === 'string') console.warn("Invalid or no creation data found for entry, will ignore sync for: ", entry.name)
        return entry.createdAt > synchronizedAt;
      }

      updates.ocurrences = updates.ocurrences.filter(classify);
      updates.areas      = updates.areas.filter(classify);
    }
  }),
  Lore.Integration({
      name: 'asana',
      populate (lore) {
        console.log('service', this.name, 'start download');
        return new Promise((served) => {
          let provider    = document.querySelector('asana-workspace'),
          listener = function () {
            let ocurrences = this.tasks.map(Task.fromAsana, Task).map(lore.assignArea, lore);
            lore.ocurrences = lore.ocurrences.concat(ocurrences);
            // TODO: provider.projects.map(Project?.fromAsana, Project);
            // TODO: provider.workspaces.map(Workspace?.fromAsana, Workspace?);
            provider.removeEventListener('populated', listener);
            console.log('service asana finish download');
            served();
          };

          provider.addEventListener('populated', listener);
          provider.limit = 100;
          provider.modifiedSince = this.since;
        });
      }
  }),
  Lore.Integration({
      name: 'i-calendars',
      populate (lore) {
        console.log('service', this.name);
        let cursors = [].slice.call(document.querySelectorAll('event-cursor'), 0),
            mapped  = cursors.map((cursor) => cursor.events),
            reduced = mapped.reduce((total, events) => total.concat(events), []),
            ocurrences;

        ocurrences      = reduced.map(Ocurrence.fromICalendar, Ocurrence).map(lore.assignArea, lore);
        lore.ocurrences = lore.ocurrences.concat(ocurrences);
      }
  })
);

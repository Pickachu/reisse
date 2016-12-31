'use strict';

Lore.integrations.add({
  refs: {
    name: 'google'
  },
  methods: {
    populate (lore) {
      return this._friendsFromEvents()
        .then((friends) => lore.friends = friends, lore);
    },
    _friendsFromEvents (lore) {
      let provider = document.querySelector('google-people');
      return Promise.all([this._attendeesFromEvents(), provider.values()]).then((resolutions) => {
        let friends = [],
          attendees = _.uniq(resolutions[0]),
          provider  = resolutions[1];

        provider.connections.forEach((connection) => {
          if (!connection.names) return;
          connection.names.forEach((naming) => {
            delete naming.metadata;
            for (let type in naming) {
              let found = _.find(attendees, {name: naming[type]});
              if (found) {friends.push(found);}
            }
          });
        });

        return Promise.resolve(_.uniq(friends));
      });
    },

    _attendeesFromEvents () {
      return this._attendedEvents().then((events) => {
        let all  = [];

        return events.reduce((last, event, index) => {
          let promise = this._attendeesFromEvent(event.id);
          promise.then((attendees) => all = all.concat(attendees));
          last.then(promise);
          return promise;
        }, Promise.resolve())
        .then(() => all);
      });
    },

    _attendeesFromEvent (id) {
      return new Promise((resolve, reject) => {
        FB.api(`/${id}/attending`, (response) => {
          if (!response.error) {
            resolve(response.data);
          } else {
            reject(response.error);
          }
        });
      });
    },

    _attendedEvents () {
      return new Promise((resolve, reject) => {
        FB.api('/me/events', (response) => {
          if (!response.error) {
            resolve(response.data)
          } else {
            reject(response.error);
          }
        });
      });
    }
  }
});

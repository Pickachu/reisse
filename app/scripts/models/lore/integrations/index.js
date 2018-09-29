'use strict';

window.Lore || (window.Lore = stampit());

Lore = Lore.static({
  Integration: stampit({
    refs: {
      since: new Date(0)
    },
    methods: {
      // TODO implement that returns a provider (foursquare element, rescue time element, etc)
      // getProvider()
      populate () {throw new TypeError("Not implemented yet");}
    }
  }),
  integrations: Object.assign([], {
      add (configuration) {
        if (!configuration) throw new TypeError("Error adding Integration");
        if (!configuration.refs && !configuration.refs.name) throw new TypeError("Integration name on refs is mandatory");
        return this.push(Lore.Integration.compose(stampit(configuration)));
      }
  })
});

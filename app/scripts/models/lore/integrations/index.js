'use strict';

window.Lore || (window.Lore = stampit());


/**
 * [Lore description]
 *
 * @type {[type]}
 */
Lore = Lore.static({
  Integration: stampit({
    refs: {
      since: new Date(0)
      // TODO implement that returns a provider (foursquare element, rescue time element, etc)
      // getProvider()
      // populate () {throw new TypeError("Not implemented yet");}
    }
  }),
  integrations: Object.assign([], {
      add (configuration) {
        if (!configuration) throw new TypeError("Invalid integration definition.");
        if (!configuration.refs) throw new TypeError("Invalid integration definition.");

        const {refs} = configuration;
        if (!refs.name) throw new TypeError("Integration name on refs is mandatory");
        if (!refs.minimunSince) throw new TypeError("Integration minimunSince on refs is mandatory");

        return this.push(Lore.Integration.compose(stampit(configuration)));
      }
  })
});

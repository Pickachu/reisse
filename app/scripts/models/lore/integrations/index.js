'use strict';

window.Lore || (window.Lore = stampit());

Lore = Lore.static({
  Integration: stampit({
    refs: {
      since: new Date(0)
    },
    methods: {
      populate () {throw new TypeError("Not implemented yet");}
    }
  }),
  integrations: []
});

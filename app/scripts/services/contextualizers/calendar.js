'use strict';

Context.add(stampit({
  refs: {
    name: 'calendar'
  },
  methods: {
    // The pure calendar context is right now
    // When used for an ocurrence the contextual now is the center of ocurrence duration
    contextualize (moment, context) {
      context.calendar = { now: moment };
      return Promise.resolve(context);
    }
  }
}));

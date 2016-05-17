'use strict';

Context.add(stampit({
  refs: {
    name: 'calendar'
  },
  methods: {
    contextualize (context) {
      let now = new Date();

      context.calendar = { now: now }

      return Promise.resolve(context);
    }
  }
}));

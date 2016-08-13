'use strict';

Context.add(stampit({
  refs: {
    name: 'calendar'
  },
  methods: {
    contextualize (moment, context) {
      context.calendar = { now: moment }

      return Promise.resolve(context);
    }
  }
}));

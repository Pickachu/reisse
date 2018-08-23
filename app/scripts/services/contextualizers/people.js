/* globals Context, Re  */
'use strict';

Context.add(stampit({
  refs: {
    name: 'people'
  },
  methods: {
    // TODO predict people at moment
    contextualize (moment, context) {
      // TODO better current people caching
      if (Context.lastPeople) return Promise.resolve(context.people = Context.lastPeople, context);

      // TODO use current people from estimator instead of inferring it from ocurrences
      if (!Re.estimators || app.ocurrences) return Promise.resolve(context.people = {}, context);
      Context.lastPeople = _(Re.estimators.ocurrences || app.ocurrences)
        .sort('start')
        .map('context.people')
        .compact()
        .value()
        .pop() || [];

      return Promise.resolve(context.people = Context.lastPeople, context);
    }
  }
}));

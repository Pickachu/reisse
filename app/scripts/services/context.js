'use strict';

var contextualizable = stampit({
  init () {
    const when = this.when.bind(this);
    Context.contextualizers.forEach((contextualizer) => {
      this.contextualizers.push(contextualizer({ areas: this.areas, when }));
    });
  },
  props: {
    areas             : [],
    contextualizers   : [],
    contextualizations: []
  },
  methods: {
    for (moment) {
      let context = {};
      this.contextualizations = [];

      this.contextualizers.forEach((contextualizer) => {
          console.log(`[context.${contextualizer.name}] discover`);
          const contextualization = contextualizer.contextualize(moment, context);
          this.contextualizations.push(contextualization);
          return contextualization;
      });

      return Promise.all(this.contextualizations).then(() => context);
    },
    when (name) {
      let index = this.contextualizers.findIndex((contextualizer) => contextualizer.name == name);
      if (!this.contextualizations[index]) throw new TypeError(`[context] This contextualizer ${name} does not return a promise or does not exist.`);
      return this.contextualizations[index];
    }
  },
  static: {
    contextualizers: [],
    add (context) {
      this.contextualizers.push(context);
    }
  }
});

var Context = contextualizable;

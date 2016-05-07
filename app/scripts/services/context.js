'use strict';

var contextualizable = stampit({
  init () {
    Context.contextualizers.forEach((contextualizer) => {
      this.contextualizers.push(contextualizer({
        areas: this.areas,
        when: this.boundWhen
      }));
    });
  },
  props: {
    areas             : [],
    contextualizers   : [],
    contextualizations: []
  },
  methods: {
    current () {
      let context = {}
      this.contextualizations = this.contextualizers.map((contextualizer) => {
          console.log("contextualizing", contextualizer.name);
          return contextualizer.contextualize(context);
      });

      return Promise.all(this.contextualizations).then(() => context);
    },
    when (name) {
      let contextualizer = this.contextualizers.findIndex((contextualizer) => contextualizer.name == name);
      if (!this.contextualizations[contextualizer]) throw new TypeError(`This contextualizer ${name} does not return a promise or does not exist.`);
      return this.contextualizations[contextualizer];
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

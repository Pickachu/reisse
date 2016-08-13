'use strict';

var suggestable = stampit({
  init () {
    Suggester.suggesters.forEach((suggester) => {
      this.suggesters.push(suggester({
        areas: this.areas,
        when: this.boundWhen
      }));
    });
  },
  props: {
    areas      : [],
    suggesters : [],
    suggestions: []
  },
  methods: {
    suggest (ocurrences, context) {
      this.suggestions = this.suggesters.map((suggester) => {
        console.log("suggesting", suggester.name);
        return suggester.suggest(ocurrences, context);
      });

      return Promise.all(this.suggestions).then(() => ocurrences);
    },
    then (resolve, reject) {
      this.suggest(this.ocurrences, this.context).then(resolve, reject);
    },
    when (name) {
      let suggester = this.suggesters.findIndex((suggester) => suggester.name == name);
      if (!this.suggestions[suggester]) throw new TypeError(`This suggester ${name} does not return a promise or does not exist.`);
      return this.suggestions[suggester];
    }
  },
  static: {
    suggesters: [],
    add (suggester) {
      this.suggesters.push(suggester);
    }
  }
});

var Suggester = suggestable;

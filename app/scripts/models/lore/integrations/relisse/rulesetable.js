export default stampit({
  init() {
    this.rules.forEach(({name}) => {
      console.log(`[integrations.relisse:ruleSet.init] rule ${name}`);
    });
  },

  refs: {

    // TODO configurable responsibility_areas
    // TODO test configuration from database
    // let workArea  = lore.areas.find((area) => area.provider.id == '9753CADC-C398-43C3-B822-5BD83795070D');
    // if (!workArea.responsibilities.includes('work')) workArea.responsibilities.push('work');

    // let map = new Map(), links = {
    //   'work'     : 'asana',
    //   'self-care': 'jawbone'
    // };

    // if (area) {
    //   if (!links[responsibility]) return console.error(`No provider defined for responsibility ${responsibility}.`, links);
    //   map.set(links[responsibility], area.provider.id);
    // } else {
    //   console.error(`No area defined for ${responsibility}!`);
    // }


    // TODO let each integration define witch responsibility each task belongs to
    // TODO let integration define witch responsibility each youtube video belongs to

    evaluate({lore}) {
      const policyContext = {
        findAreaByResponsiblity (responsibility) {
          const area = lore.areas.find(({responsibilities}) => responsibilities.includes(responsibility));
          if (!area) {
            throw new TypeError(`[integrations.relisse:ruleSet.evaluate]: Area bound to responsibility '${responsibility}' could not be found.`);
          }
          return area;
        }
      };

      this.rules.forEach(({name, uses, evaluator}) => {
        const itemName = uses.substring(0, uses.length - 1);
        const policy = new Function(itemName, evaluator);
        Object.defineProperty(policy, 'name', {get() {return name}});
        lore[uses].forEach(policy.bind(policyContext));
      });
    }
  }

});

// Default ruleSets of Heitor
// [
//   [{
//     "evaluator": "if (area.provider.id === 'DB064DE2-7E53-4164-BBF3-A45C88DC54BF' && !area.responsibilities.includes('learning')) area.responsibilities.push('learning');",
//     "name": "Relisse Learning Responsibility ➜ Things Learning Area",
//     "uses": "areas"
//   }, {
//     "evaluator": "if (area.provider.id === 'DF629F9B-61F6-4878-B92E-3AD4D38CECE0' && !area.responsibilities.includes('fun')) area.responsibilities.push('fun');",
//     "name": "Relisse Fun Responsibility ➜ Things Fun Area",
//     "uses": "areas"
//   }, {
//     "evaluator": "if (area.provider.id === '9753CADC-C398-43C3-B822-5BD83795070D' && !area.responsibilities.includes('work')) area.responsibilities.push('work');",
//     "name": "Things Work Area ➜ Relisse Work Area",
//     "uses": "areas"
//   }],
//   [{
//     "evaluator": "if (!ocurrence.areaId && ocurrence.provider.name === 'asana') ocurrence.areaId = this.findAreaByResponsiblity('work').provider.id;",
//     "name": "Asana Occurrences ➜ Work Area",
//     "uses": "ocurrences"
//   }, {
//     "evaluator": "if (!ocurrence.areaId && ocurrence.provider.name === 'asana') ocurrence.areaId = this.findAreaByResponsiblity('self-care').provider.id;",
//     "name": "Jawbone Occurrences ➜ Self Care Area",
//     "uses": "ocurrences"
//   }],
//   [{
//     "evaluator": "if (!ocurrence.areaId && ocurrence.provider.name === 'youtube' && ocurrence.provider.categoryId === '24') ocurrence.areaId = this.findAreaByResponsiblity('fun').provider.id;",
//     "name": "YouTube Entertainment Videos ➜ Fun Area",
//     "uses": "ocurrences"
//   }, {
//     "evaluator": "if (!ocurrence.areaId && ocurrence.provider.name === 'youtube' && ['27', '28', '29'].includes(ocurrence.provider.categoryId)) ocurrence.areaId = this.findAreaByResponsiblity('learning').provider.id",
//     "name": "YouTube Educational Videos ➜ Learning Area",
//     "uses": "ocurrences"
//   }]
// ]

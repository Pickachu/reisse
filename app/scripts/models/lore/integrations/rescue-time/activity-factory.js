export default stampit().static({
  create(attributes) {
    let item = {};

    // This property should provide enough information for later querying
    // the provider service for the record data associated with this activity
    // since rescue time does not give us a identifier we put a lot of info here
    item.provider = {
      name    : 'rescue-time',
      category: attributes.category,
      document: attributes.document,
      restriction: [attributes.start.format('Y-MM-DD'), attributes.end.format('Y-MM-DD')]
    };

    item.name = attributes.document;
    item.activity = this.makeActivityDetails(attributes);
    item.context = this.makeActivityContext(attributes);

    item.start = attributes.start.valueOf();
    item.end = attributes.end.valueOf();

    item.features = {
      duration: {actual: attributes.time_spent.asMilliseconds()}
    };

    item.status = 'complete';

    item.createdAt = attributes.start.valueOf();
    item.updatedAt = attributes.start.valueOf();
    item.activatedAt = null
    item.completedAt = attributes.end.valueOf();

    return Activity.fromJSON(item);
  },

  makeActivityDetails({activity, category, productivity}) {
    let details = {};
    if (activity == 'youtube.com') {
      details.type = 'browse';
    } else {
      details.type = 'unknown';
    }

    // Rescue time responds with a scale between -2 and 2 on productivty attribute
    // normalzie here to
    details.quality = (productivity + 2) / 5;

    details.category = _.kebabCase(category);

    return details;
  },
  // TODO change tools to an array of ids
  makeActivityContext({activity, category, productivity}) {
    let context = {};
    if (activity == 'youtube.com') {
      context.tools = [{name: 'YouTube', type: 'website'}];
    }
    return context;
  }
});

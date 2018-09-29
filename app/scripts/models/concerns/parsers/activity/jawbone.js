// TODO move this to jawbone integration
Activity = Activity.static({
  fromJawbone(json) {
    json = Object.assign({}, json);
    json.details = Object.assign({}, json.details);
    json = Jawbone.normalizeType(json);

    json.provider = {
      id      : json.xid,
      name    : 'jawbone',
      type    : json.type,
      subType : json.sub_type
    };

    json.activity || (json.activity = {
      type: json.type
    });

    json.time_created       && (json.createdAt   = json.time_created   * 1000);
    json.time_updated       && (json.updatedAt   = json.time_updated   * 1000);
    json.time_completed     && (json.completedAt = json.time_completed * 1000);

    if (json.venue) {
      json.context = {
        venue: json.venue
      };
    }

    // TODO figure out why time_completed is not needed here
    // json.status = (json.time_completed) ? 'complete' : 'open';

    delete json.xid;
    delete json.type;
    delete json.title;
    delete json.shared;
    delete json.sub_type;
    delete json.date;
    delete json.time_created;
    delete json.time_completed;
    delete json.time_updated;
    delete json.venue;

    return this.fromJSON(json);
  }
});

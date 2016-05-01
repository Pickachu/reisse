Jawbone = {
  normalizeType (json) {
    let details = json.details
    json.features = {};

    this.venue(json);
    this[json.type](json, details);

    // TODO discover where in the ocurrence structure will this thing be
    details.quality  && (json.quality = details.quality);

    delete json.details;

    return json;
  },

  venue (json) {
    let venue = {};

    json.place_lat  && (venue.latitude  = json.place_lat);
    json.place_lon  && (venue.longitude = json.place_lon);
    json.place_name && (venue.name      = json.place_name);
    json.place_acc  && (venue.accuracy  = json.place_acc);

    delete json.place_lat;
    delete json.place_lon;
    delete json.place_name;
    delete json.place_acc;

    json.venue = venue;
  },
  sleeps (json, details) {
    json.activity = {type: 'sleep'};

    details.asleep_time && (json.start = json.asleepAt = new Date(details.asleep_time * 1000));
    details.awake_time  && (json.end   = json.awakeAt  = new Date(details.awake_time  * 1000));
    details.duration    && (json.features.duration     = {actual: details.duration    * 1000});
  }
}

Ocurrence = Ocurrence.static({
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

    json.time_created       && (json.createdAt   = new Date(json.time_created   * 1000));
    json.time_updated       && (json.updatedAt   = new Date(json.time_updated   * 1000));
    json.time_completed     && (json.completedAt = new Date(json.time_completed * 1000));

    delete json.xid;
    delete json.type;
    delete json.title;
    delete json.shared;
    delete json.sub_type;
    delete json.date;
    delete json.time_created;
    delete json.time_completed;
    delete json.time_updated;

    return Ocurrence(json);
  }
});

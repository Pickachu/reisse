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
    json.type = 'sleep';
    json.name || (json.name = 'Sleep');

    details.asleep_time && (json.start = json.asleepAt = details.asleep_time          * 1000);
    details.awake_time  && (json.end   = json.awakeAt  = details.awake_time           * 1000);
    details.duration    && (json.features.duration     = {actual: details.duration    * 1000});
  }
}

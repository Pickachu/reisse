// Jawbone to Reissë type converter
// https://jawbone.com/up/developer/types

const Jawbone = {
  _mealNameBySubtype: {
    1: 'Breakfast',
    2: 'Lunch',
    3: 'Dinner'
  },
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
    json.place_type && (venue.type      = json.place_type);
    json.place_acc  && (venue.accuracy  = json.place_acc);
    json.place_id   && (venue.id        = json.place_id);

    delete json.place_id;
    delete json.place_lat;
    delete json.place_lon;
    delete json.place_name;
    delete json.place_acc;
    delete json.place_type;

    json.venue = venue;
  },
  sleeps (json, details) {
    json.type = 'sleep';
    json.name || (json.name = 'Sleep');

    details.asleep_time && (json.start = json.asleepAt = details.asleep_time          * 1000);
    details.awake_time  && (json.end   = json.awakeAt  = details.awake_time           * 1000);
    // duration is in seconds
    details.duration    && (json.features.duration     = {actual: details.duration});

    if (json.start && json.end) {
      json.status = 'complete';
    } else {
      json.status = 'open';
    }
  },

  meals (json, details) {
    json.type = 'meal';
    json.name = this._mealNameBySubtype[json.sub_type] || "Meal";
    json.status = 'complete';

    // TODO think how to store multiprovider scores
    // if (details.food_score) {
    //   json.score || (json.score = {});
    //   json.score.jawbone = details.food_score;
    // }

    json.calories = details.calories;

    json.macronutrients = {
      carbohydrate: {
        total: details.carbohydrate
      },
      fat: {
        total: details.fat,
        saturated: details.saturated_fat,
        unsaturated: details.unsaturated_fat,
        polyunsaturated: details.polyunsaturated_fat,
        monounsaturated: details.monounsaturated_fat,
        cholesterol: details.cholesterol
      },
      protein: {
        total: details.protein
      },
      fiber: {
        total: details.fiber
      }
    };

    json.micronutrients = {
      calcium: details.calcium,
      potassium: details.potassium,
      sodium: details.sodium,
      iron: details.iron,
      vitamin_a: details.vitamin_a,
      vitamin_c: details.vitamin_c
    };

    json.items = json.note.split(', ').map((food) => {
      return { name: food };
    });

    delete json.note;

    this.unsetUndefined(json.macronutrients);
    this.unsetUndefined(json.micronutrients);
  },

  unsetUndefined (object) {
    _.each(object, (v, k) => {
      if(_.isUndefined(v)) {
        delete object[k];
      } else if(_.isObject(v)) {
        this.unsetUndefined(v);
      }
    });
  }
}

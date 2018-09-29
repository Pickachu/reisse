'use strict';

// TODO move to a namespace
const ActivityFactory = stampit().static({
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
      duration: {actual: attributes.time_spent.asSeconds()}
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


Lore.integrations.add({
  refs: {
    name: 'rescue-time',
    // https://www.crunchbase.com/organization/rescuetime
    minimunSince: new Date(Date.parse('Sun, 01 Apr 2007 00:00:00 GMT')),
  },
  methods: {
    populate (lore) {
      console.log('service', this.name, 'start download');
      const provider = document.querySelector('rescue-time-analytics');
      return this.__fetchUserKey()
        .then((key) => {
          Object.assign(provider, {
            key,
            perspective: 'interval',
            resolutionTime: 'minute',
            restrictKind: 'document',
          });
        })
        .then(() => {
          const cursor = moment(this.since);
          return this._fetch({
            restrictBegin: cursor.toDate(),
            restrictEnd: moment.max(cursor.clone().add(1, 'month'), moment(this.until)).toDate(),
          })
        })
        .then((rows) =>
          _(rows)
            .thru(RescueTime.normalizeRows.bind(RescueTime))
            .map(ActivityFactory.create.bind(ActivityFactory))

            // For now we ignore all activities (only youtube) that last less than
            // a minute
            .filter(({features: {duration: {actual}}}) => (actual > 60) )
            .value()
        )
        .then((activities) =>
          console.log(`service ${this.name} created ${activities.length} from ${provider.model.length} records`), activities
        )
        .then((activities) =>
          lore.ocurrences = lore.ocurrences.concat(activities)
        );
    },

    _fetch(options) {
      // TODO implement promise api for rescue-time-analytics
      return new Promise((resolve, reject) => {
        let provider    = document.querySelector('rescue-time-analytics'), {name} = this;

        function populated () {
          console.log(`service ${name} download finished`);
          resolve(provider.model); unlisten();
        }

        function paged ({detail: {pagination: {page, pages}}}) {
          console.log(`service ${name}: ${page} of ${pages} (${this.model.length} records accumulated)`);
        }

        function unlisten () {
          provider.removeEventListener('populated', populated);
          provider.removeEventListener('paged', paged);
          provider.addEventListener('error', unlisten);
          provider.removeEventListener('error', reject);
        }

        Object.assign(provider, options);
        provider.addEventListener('populated', populated);
        provider.addEventListener('paged', paged);
        provider.addEventListener('error', unlisten);
        provider.addEventListener('error', reject);
        provider.fetch();
      });
    },

    // TODO formalize client access and database access for integrations
    // probably on synchronizerable
    __fetchUserKey() {
      // TODO get firebase user id, firebase.getAuth()
      const userId = 'me';
      const location = `https://boiling-fire-6466.firebaseio.com/users/${userId}/settings/integrations/rescueTime/key`;
      return new Firebase(location)
        .once('value')
        .then((snapshot) => snapshot.val());
    },

    /***
     * Filter array of ocurrences to specified synchronization range
     *
     * @param  {[type]} ocurrences [description]
     *
     * @return {[type]}            [description]
     */
    _timeAwareFilter(ocurrences) {
      let classify = (entry) => {
        if (!entry.updatedAt || typeof entry.updatedAt === 'string') console.warn("Invalid or no modification date found for entry, will ignore sync for: ", entry.name)
        return entry.updatedAt > this.since && entry.updatedAt < this.until;
      };

      return ocurrences.filter(classify);
    }
  }
});

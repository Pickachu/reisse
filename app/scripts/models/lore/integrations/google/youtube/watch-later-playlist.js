'use strict';

const ActivityFactory = stampit().static({
  create(attributes) {
    const {video: {contentDetails, snippet}} = attributes;
    let item = {};

    // This property should provide enough information for later querying
    // the provider service for the record data associated with this activity
    item.provider = {
      name: 'youtube',
      id: attributes.id, // playlist item id
      etag: attributes.etag,
      videoId: attributes.resourceId.videoId,
      playlistId: attributes.playlistId,
      channelId: snippet.channelId,
      categoryId: snippet.categoryId
    };

    // Relissë activity qualification details
    // This properties should provide a integration with this activity
    // and relissë acceptable activities
    item.activity = {
      type: 'watch',
      category: 'video',
      // quality: TODO infer some quality of the watching
    };
    item.context = {tools: [{name: 'YouTube', type: 'website'}]};
    item.status = 'open';

    // Video content details
    item.name = snippet.title;
    item.dimension = contentDetails.dimension;
    item.duration = moment.duration(contentDetails.duration).asMilliseconds();
    item.projection = contentDetails.projection;
    item.definition = contentDetails.definition;
    item.tags = snippet.tags;
    item.thumbnails = snippet.thumbnails;

    item.createdAt = attributes.publishedAt;
    item.activatedAt = null

    return Activity.fromJSON(item);
  },
});


Lore.integrations.add({
  refs: {
    name: 'youtube-watch-later-playlist',
    // https://www.crunchbase.com/organization/youtube
    minimunSince: new Date(Date.parse('Tue Feb 01 2005 00:00:00')),

    async populate (lore) {
      console.log('service', this.name, ': start download');
      const provider = document.querySelector('youtube-playlist');
      this.monitor(provider);

      const {playlistId} = await this.__fetchUserSettings();
      Object.assign(provider, {
        playlistId,
        publishedAfter: this.since,
        publishedBefore: this.until
      });

      const items = await provider.videos();
      const activities = items.map(ActivityFactory.create.bind(ActivityFactory));
      console.log(`service ${this.name}: created ${activities.length} activities from ${items.length} records`);
      lore.ocurrences = lore.ocurrences.concat(activities)
    },
  },
  methods: {

    monitor(provider) {
      const {name} = this;

      function populated ({detail: {capped, kind}}) {
        let message = `service ${name}: download finished [${kind}]`
        if (capped) { message += ` (skipped some, probably because time capping)`; }
        console.log(message);
        if (kind === 'videos') unlisten();
      }

      function paged ({detail: {pagination: {page, pages}, kind}}) {
        console.log(`service ${name}: ${page} of ${pages} [${kind}]`);
      }

      function unlisten () {
        provider.removeEventListener('populated', populated);
        provider.removeEventListener('paged', paged);
        provider.addEventListener('error', unlisten);
      }

      provider.addEventListener('populated', populated);
      provider.addEventListener('paged', paged);
      provider.addEventListener('error', unlisten);
    },

    // TODO formalize client access and database access for integrations
    // probably on synchronizerable
    __fetchUserSettings() {
      // TODO get firebase user id, firebase.getAuth()
      const userId = 'me';
      const location = `https://boiling-fire-6466.firebaseio.com/users/${userId}/settings/integrations/${this.name}`;
      return new Promise(function(resolve, reject) {
        new Firebase(location)
          .once('value', (snapshot) => resolve(snapshot.val()))
          .catch(reject);
      });
    },
  }
});

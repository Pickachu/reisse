'use strict';

window.Lore || (window.Lore = stampit());

Lore = Lore.static({
  modelable: stampit({
      init () {
          this.areas      = this.areas.map(Area);
          this.ocurrences = this.ocurrences.map(Ocurrence.fromJSON, Ocurrence);
      },
      props: {
          areas: [],
          ocurrences: []
      },
      methods: {
          changes (attributes) {
              var changes = [];

              changes = changes.concat(this.collectionChanges('areas', attributes.areas));
              changes = changes.concat(this.collectionChanges('ocurrences', attributes.ocurrences));

              return this._normalizeChanges(changes);
          }
      },
      static: {
        fromSnapshots(snapshots) {
          return Lore({
            areas: this._valueFromSnapshot(snapshots.areas),
            ocurrences: this._valueFromSnapshot(snapshots.ocurrences),
            synchronizedAt: snapshots.synchronizedAt.val() || new Date(0)
          });
        },
        _valueFromSnapshot(snapshot) {
          return _(snapshot.val()).map((value, key) => {
            value.__firebaseKey__ = key;
            return value;
          }).value();
        }
      }
  })
});

Lore = Lore.compose(differentiable, Lore.synchronizable, Lore.integrable, Lore.modelable, Lore.deduplicator);

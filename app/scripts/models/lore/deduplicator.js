'use strict';

window.Lore || (window.Lore = stampit());


/**
 * Lore.deduplicator
 *
 * Very hardcore only id based deduplicator, use when you are almost sure
 * that ocurrences with same provider id can be Removed
 *
 * Snippet:
 * await app.fetch();
 * dedupper = Lore.deduplicator({location: app.location, ocurrences: app.ocurrences});
 * dedupper._deduplicate(dedupper._findDuplicates(14000));
 *
 */
Lore = Lore.static({
  deduplicator: stampit({
    methods: {
      deduplicate (start) {
        new Firebase(this.location).child('ocurrences').once('value', (snapshot) => {
          this.ocurrences = this._valueFromSnapshot(snapshot).map(Ocurrence.fromJSON, Ocurrence);
          this._deduplicate(this._findDuplicates(start));
        });
      },
      _findDuplicates (start) {
        let space, duplicates = [], stored = [];

        space = this.ocurrences.slice(start, this.ocurrences.length - 1);

        if (space.filter(({provider}) => provider).length !== space.length) {
          console.warn(`Lore.deduplicator: skipped ${space.filter(({provider}) => provider).length - space.length} unidentifiable ocurrences.`);
        }

        space
          .filter(({provider}) => provider)
          .map(({provider}) => provider.id)
          .forEach((unverified, index) => {
            if (duplicates.includes(unverified)) return; // Skip already found results

            let results = this.ocurrences
              .filter(({provider}) => provider && provider.id === unverified)
              .map(({provider: {id}}) => id);

            if (results.length == 2) {
              duplicates.push(results[0]);
            } else if (results.length > 2) {
              throw new TypeError('Too many duplicates, dont know how to deal');
            }
        });

        return duplicates;
      },
      _deduplicate (duplicates) {
        let query, deduplicate;

        deduplicate = () => {
          let duplicate = duplicates.shift();
          if (!duplicate) return console.log('lore.deduplicate: finished removing duplicates');

          // TODO explict by date sorting
          let query = new Firebase(this.location)
            .child('lore/ocurrences').orderByChild('provider/id')
            .equalTo(duplicate).limitToLast(2);

          query.once('value', (snapshot) => {
            if (snapshot.numChildren() < 2) {
              console.warn('lore.deduplicate: Invalid duplicated item!');
              return deduplicate();
            }

            let duplicates = snapshot.val(), duplicated = Object.keys(duplicates)[0]
            snapshot.ref().child(duplicated).remove((error) => {
              if (!error) {
                console.log('lore.deduplicate: Removed duplicated', duplicated, duplicates[duplicated].name);
              } else {
                console.error(error)
              }

              deduplicate();
            });
          });
        }

        deduplicate();
      }
    }
  })
});

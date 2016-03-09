'use strict'

let deduplicator = stampit({
  methods: {
    deduplicate (start) {
      new Firebase(this.location).child('ocurrences').once('value', (snapshot) => {
        this.ocurrences = _.toArray(snapshot.val()).map(Ocurrence.fromJSON, Ocurrence);
        this._deduplicate(this._findDuplicates(start));
      });
    },
    _findDuplicates (start) {
      let space, duplicates = [];
      space = this.ocurrences.slice(start, this.ocurrences.length - 1);

      space.forEach((uncertified, index) => {
        if (!uncertified.provider) return console.warn(`No provider found for ocurrence. ${uncertified.name}`);
        let result = this.ocurrences.findIndex((other) => other.provider && other.provider.id === uncertified.provider.id);

        if (result != start + index) {
          duplicates.push(uncertified.provider.id);
        }
      });

      duplicates
    },
    _deduplicate (duplicates) {
      let query, deduplicate;

      deduplicate = () => {
        let duplicate = duplicates.shift();
        if (!duplicate) return console.log('lore.deduplicate: finished removing duplicates');

        let query = new Firebase(this.location + '/ocurrences').orderByChild('provider/id').equalTo(duplicate).limitToLast(2);

        query.once('value', (snapshot) => {
          if (snapshot.numChildren() < 2) {
            console.warn('lore.deduplicate: Invalid duplicated item!');
            return deduplicate();
          }
          let duplicates = snapshot.val(), duplicated = Object.keys(duplicated)[0]

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

      deduplicate()
    }
  }
});

var Lore = window.Lore || {}
Lore.deduplicator = deduplicator;

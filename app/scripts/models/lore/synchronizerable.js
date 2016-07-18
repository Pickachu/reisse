'use strict';

window.Lore || (window.Lore = stampit())

Lore = Lore.static({
  synchronizerable: stampit({
    methods: {
      synchronize () {
        this.changeCount = Object.keys(this.changes).length;
        this.split();
        return this.process();
      },

      split () {
        let batch = {}, index = 0, maximum = this.maximum, key;

        if (this.changeCount) console.log(`synchronizer.split: ${this.changeCount} changes to synchronize.`);
        else return console.log('synchronizer.split: No changes to synchronize.');

        for (key in this.changes) {
          if (index >= maximum) {
            index = 0;
            this.batches.push(batch);
            batch = {};
          }

          batch[key] = this.changes[key];
          index++;
        }

        this.batches.push(batch);
      },
      process () {
        if (!this.batches.length) return Promise.resolve(console.log('synchronizer.process: Finished synchronizing.'));

        // Send all batches one after another
        let current = this.batches.shift();
        return this.send(current).then(this.process.bind(this));
      },
      send (batch) {
        return this.query.update(batch).catch(this.failed.bind(this));
      },
      failed (error) {
        console.log('synchronizer.send: Synchronized batch.');
        if (error) throw new Error `lore: Error synchronizing. ${error.message}`
      }
    },
    init() {
      this.query = new Firebase(this.location);
    },
    props: {
      maximum: 500,
      status: 'pending',
      batches: []
    }
  })
});

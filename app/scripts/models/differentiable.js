'use strict';

let differentiable = stampit({
    methods: {
      changes (update) {
        return this.changeset(this, update);
      },
      changeset (value, update) {
        let omissions = _.keys(_.pick(value, _.isArray));
        return this._normalizeChanges(diff(_.omit(value, omissions), _.omit(update, omissions)));
      },

      collectionChanges (name, updates) {
        let changes = [];

        updates.forEach((update) => {
          let value = this[name].find((value) => value.provider && value.provider.id == update.provider.id),
              updateset;

          if (value) {
            let key = value.__firebaseKey__;
            if (!key && !Number.isFinite(key)) return console.error('differentiable.collectionChanges: refusing to compute changes to value without key.', key, value, update);
            update.__firebaseKey__ || (update.__firebaseKey__ = key);

            updateset = value.changes ? value.changes(update) : this.changeset(value, update);

            this._prefixChanges(key, updateset);
            changes = changes.concat(updateset);
          } else {
            changes.push({key: [], value: update, type: 'push'});
          }
        }, this);

        this._prefixChanges(name, changes);

        return changes;
      },

      arrayChanges (name, updates) {
          var changes = [];

          updates.forEach((update) => {
              var value = this[name].find((value) => value.provider && value.provider.id == update.provider.id),
                  index = this[name].indexOf(value), updateset;

              if (value) {
                  updateset = value.changes ? value.changes(update) : this.changeset(value, update);
                  this._prefixChanges(index, updateset);
                  changes = changes.concat(updateset);
              } else {
                  changes.push({key: [], value: update, type: 'push'});
              }
          }, this);

          this._prefixChanges(name, changes);

          return changes;
      },
      _prefixChanges (name, changes) {
          changes.forEach((change) => change.key.unshift(name));
          return changes;
      },
      _normalizeChanges (changes) {
          let i = changes.length, change;
          while (i--) {
              change = changes[i];
              switch (change.type) {
                case 'put':
                  if (_.isUndefined(change.value) || _.isFunction(change.value) || change.key[change.key.length - 1].startsWith('__')) {
                      changes.splice(i, 1);
                  }
                  break;
                case 'del':
                  change.value = null;
                  break;
                case 'push':
                  break;
                default:
                  throw new TypeError(`InvalidChangeType: Expected either put or del found ${change.type}`)
                  break;
              }

          }

          return changes;
      }
  }
});

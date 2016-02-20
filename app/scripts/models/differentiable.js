'use strict';

var differentiable = stampit({
    methods: {
        changes (update) {
            return this.changeset(this, update);
        },
        changeset (value, update) {
            let omissions = _.keys(_.pick(value, _.isArray));
            return this._omitChanges(diff(_.omit(value, omissions), _.omit(update, omissions)));
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
        _omitChanges (changes) {
            let i = changes.length, change;
            while (i--) {
                change = changes[i];

                if (_.isUndefined(change.value) || _.isFunction(change.value) || change.key[change.key.length - 1].startsWith('__')) {
                    changes.splice(i, 1);
                }
            }

            return changes;
        }
    }
})

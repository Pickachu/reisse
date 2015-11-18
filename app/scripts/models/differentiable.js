var differentiable = stampit({
    methods: {
        changes () {
            throw new Error("differentiable.changes: Not implemented yet");
        },
        arrayChanges (name, updates) {
            var changes = [];

            updates.forEach((update) => {
                var value  = this[name].find((value) => value.provider.id == update.provider.id),
                    index = this[name].indexOf(value),
                    updateset,
                    subarrays = _.keys(_.pick(value, _.isArray));

                if (value) {
                    updateset = diff(_.omit(value, subarrays), _.omit(update, subarrays));
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
        }
    }
})

'use strict'

Date.prototype.toICALDate = function () {
    return this.toISOString().slice(0, 10).replace(/-/g, '')
};
// TODO
// Date.prototype.toICALDateTime = => {
//     return this.toISODate().slice(0, 10).replace('-', '')
// }


var taskable = stampit({
    init() {
        this.area || (this.area = {name: 'no area', id: null});
        Object.assign(this.features, Feature.many(this, 'duration', 'chance'));
    },
    static: {
        _chanceFromStatus(status) {
            // On open state there is no chance
            switch (status) {
            case 'completed': return 1;
            case 'canceled' : return 0;
            case 'open'     : return 0;
            default         : return null;
            }
        },
        fromThings (json) {
            json = Object.assign({features: {}}, json);
            // Computations
            json.provider  = {
                name: 'things',
                id: json.id
            };

            json.features.chance = {actual: this._chanceFromStatus(json.status)};

            // Renamings
            json.dueDate     && (json.start       = new Date(json.dueDate));
            json.createdAt   && (json.createdAt   = new Date(json.creationDate));
            json.updatedAt   && (json.updatedAt   = new Date(json.modificationDate));
            json.activatedAt && (json.activatedAt = new Date(json.activationDate));
            json.completedAt && (json.completedAt = new Date(json.completionDate));
            json.cancelledAt && (json.cancelledAt = new Date(json.cancellationDate));
            json.description && (json.description = json.notes);

            // Cleanup
            delete json.id;
            delete json.dueDate;
            delete json.activationDate;
            delete json.creationDate;
            delete json.modificationDate;
            delete json.notes;

            return Task(json);
        },
        // TODO parse due_on and project
        fromAsana (json) {
            json = Object.assign({features: {}}, json);

            // Computations
            json.provider = {
                name: 'asana',
                id: json.id
            };

            json.status = (json.completed) ? 'completed' : 'open'
            json.features.chance = {actual: this._chanceFromStatus(json.status)};

            // Renaming
            json.due_at          && (json.start          = new Date(json.due_at));
            json.completed_at    && (json.completedAt    = new Date(json.completed_at));
            json.assignee_status && (json.assigneeStatus = json.assignee_status);
            json.num_hearts      && (json.num_hearts     = json.num_hearts);

            // Cleanup
            delete json.due_at;
            delete json.assignee_status;
            delete json.num_hearts;
            delete json.completed

            return Task(json);
        },
        fromJSON (json) {
            json.start       && (json.start       = new Date(json.start));

            json.createdAt   && (json.createdAt   = new Date(json.createdAt));
            json.updatedAt   && (json.updatedAt   = new Date(json.updatedAt));
            json.activateAt  && (json.activateAt  = new Date(json.activateAt));
            json.completedAt && (json.completedAt = new Date(json.completedAt));
            json.cancelledAt && (json.cancelledAt = new Date(json.cancelledAt));

            return Task(json);

        }
    }
});

var Task = stampit.compose(Ocurrence, taskable);

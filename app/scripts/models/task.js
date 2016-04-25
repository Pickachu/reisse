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
      Object.assign(this.features, Feature.many(this, 'duration', 'brainCycles'));
    },
    props: {
      tagNames: []
    },
    methods: {

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
          json.dueDate            && (json.start       = new Date(json.dueDate));
          json.creationDate       && (json.createdAt   = new Date(json.creationDate));
          json.modificationDate   && (json.updatedAt   = new Date(json.modificationDate));
          json.activationDate     && (json.activatedAt = new Date(json.activationDate));
          json.completionDate     && (json.completedAt = new Date(json.completionDate));
          json.cancellationDate   && (json.cancelledAt = new Date(json.cancellationDate));
          json.notes              && (json.description = json.notes);

          // Cleanup
          delete json.id;
          delete json.dueDate;
          delete json.creationDate;
          delete json.modificationDate;
          delete json.activationDate;
          delete json.completionDate;
          delete json.cancellationDate;
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
          if (json.due_at)  {
            json.due_at          && (json.start          = new Date(json.due_at));
          } else {
            json.due_on          && (json.start          = new Date(json.due_on));
          }

          json.completed_at    && (json.completedAt    = new Date(json.completed_at));
          json.created_at      && (json.createdAt      = new Date(json.created_at));
          json.assignee_status && (json.assigneeStatus = json.assignee_status);
          json.num_hearts      && (json.num_hearts     = json.num_hearts);


          // Cleanup
          if (json.projects && !json.projects.length) delete json.projects;

          delete json.due_on;
          delete json.due_at;
          delete json.created_at;
          delete json.assignee_status;
          delete json.num_hearts;
          delete json.completed_at;
          delete json.completed;


          return Task(json);
      },
      fromJSON (json) {
          json.start       && (json.start       = new Date(json.start));

          (typeof json.createdAt   != 'string') && json.createdAt   && (json.createdAt   = new Date(json.createdAt));
          (typeof json.updatedAt   != 'string') && json.updatedAt   && (json.updatedAt   = new Date(json.updatedAt));
          (typeof json.activatedAt != 'string') && json.activatedAt && (json.activatedAt = new Date(json.activatedAt));
          (typeof json.completedAt != 'string') && json.completedAt && (json.completedAt = new Date(json.completedAt));
          (typeof json.cancelledAt != 'string') && json.cancelledAt && (json.cancelledAt = new Date(json.cancelledAt));

          return Task(json);
      }
  }
});

var Task = stampit.compose(Ocurrence, taskable, awarable);

'use strict'

var taskable = stampit({
    init() {
      // Object.assign(this.features, Feature.many(this, 'duration', 'brainCycles'));
    },
    props: {
      tagNames: []
    },
    methods: {
      createSpecie () {
        this.specie = [
          this.name,
          this.tagNames.join(' ')
        ];
      }
    },
    static: {
      _chanceFromStatus(status) {
        // On open state there is no chance
        switch (status) {
          case 'completed': return 1;
          case 'canceled' : return 0;
          default         : return null;
        };
      },
      statusMap: new Map([
        ['completed', 'complete'],
        ['canceled' , 'cancel'  ],
        ['open'     , 'open'    ]
      ]),
      fromThings (json) {
        json = Object.assign({features: {}}, json);

        // Computations
        json.provider  = {
            name: 'things',
            id: json.id
        };

        json.features.chance = {actual: this._chanceFromStatus(json.status)};
        json.status = this.statusMap.get(json.status);

        // Renamings
        json.dueDate            && (json.start       = json.dueDate);
        json.creationDate       && (json.createdAt   = json.creationDate);
        json.modificationDate   && (json.updatedAt   = json.modificationDate);
        json.activationDate     && (json.activatedAt = json.activationDate);
        json.completionDate     && (json.completedAt = json.completionDate);
        json.cancellationDate   && (json.cancelledAt = json.cancellationDate);
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

        return this.fromJSON(json);
      },
      // TODO parse due_on and project
      fromAsana (json) {
        json = Object.assign({features: {}}, json);

        // Computations
        json.provider = {
            name: 'asana',
            id: json.id
        };

        json.status = (json.completed) ? 'complete' : 'open';
        json.features.chance = {actual: this._chanceFromStatus(json.status)};

        // Renaming
        if (json.due_at)  {
          json.due_at          && (json.start        = json.due_at);
        } else {
          json.due_on          && (json.start        = json.due_on);
        }

        json.completed_at    && (json.completedAt    = json.completed_at);
        json.created_at      && (json.createdAt      = json.created_at);
        json.modified_at     && (json.updatedAt      = json.modified_at);
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


        return this.fromJSON(json);
      },
      fromJSON (json) {
        let activity = Activity.fromJSON(json);
        activity.cancelledAt && (activity.cancelledAt = new Date(activity.cancelledAt));
        return Task(activity);
      }
  }
});

var Task = Ocurrence.compose(taskable, awarable);

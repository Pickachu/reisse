'use strict'

var taskable = stampit({
    init() {
      // Object.assign(this.features, Feature.many(this, 'duration', 'brainCycles'));
    },
    props: {
      tags: []
    },
    methods: {
      createSpecie () {
        this.specie = [
          this.name,
          this.tags.join(' ')
        ];
      }
    },
    static: {
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

        json.status = this.statusMap.get(json.status);

        // Renamings
        json.dueDate            && (json.start       = json.dueDate);
        json.creationDate       && (json.createdAt   = json.creationDate);
        json.modificationDate   && (json.updatedAt   = json.modificationDate);
        json.activationDate     && (json.activatedAt = json.activationDate);
        json.completionDate     && (json.completedAt = json.completionDate);
        json.cancellationDate   && (json.cancelledAt = json.cancellationDate);
        json.notes              && (json.description = json.notes);
        json.tagNames           && (json.tags        = json.tagNames);


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

        // TODO Remember to fix parsing on next reimport
        // start is coming as an string, it must come as a Timestamp
        // probably using Date.parse, moment or new Date
        // also update old asana tasks, anticipation(estimator).contextualizer
        // and people(estimator) ocurrence.start filtering
        console.log('will parse asana due date');
        debugger;

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
        delete json.modified_at;
        delete json.assignee_status;
        delete json.num_hearts;
        delete json.completed_at;
        delete json.completed;


        return this.fromJSON(json);
      },
      fromJSON (json) {
        // TODO figure out why pure composition is not solving this!
        let activity = Activity.fromJSON(json);
        activity.cancelledAt && (activity.cancelledAt = new Date(activity.cancelledAt));
        return Task(activity);
      }
  }
});

var Task = Ocurrence.compose(taskable, awarable);

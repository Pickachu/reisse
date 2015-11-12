var Area = stampit({
    init () {
        var tasks = this.tasks || [];
        tasks = tasks.map(Task.fromJSON, Task);
        this.tasks = tasks;

        var events = this.events || [];
        events = events.map(Ocurrence.fromJSON, Ocurrence);
        this.events = events;

        this.ocurrences = this.tasks.concat(this.events);
        return this;
    },
    props: {
        impact: 1
    },
    methods: {
        estimate () {
            this.tasks.avarageDuration      = 25 * 60;
            this.events.avarageDuration     = 20 * 60;
            this.ocurrences.avarageDuration = (this.tasks.avarageDuration + this.events.avarageDuration) / 2;
            this.avarageDuration = 2 * 60 * 60;
        },
        assign(attributes) {
            this.ocurrences.forEach((ocurrence) => {
                var result = attributes.ocurrences.find((update) => ocurrence.provider.id == update.provider.id);
                if (result) {
                    _.merge(result, ocurrence);
                } else {
                    this.ocurrences.unshift(ocurrence);
                }
            });
        },
        // Render one calendar for area
        toICALString () {
            var string = "BEGIN:VEVENT";
            string += `DTSTART;VALUE=${this.dtstart.toICALDate()}`;
            string += `DTEND;VALUE=${this.dtend.toICALDate()}`;
            // string += `DTSTAMP:${this.dtstamp}`;
            string += `DESCRIPTION:${this.description}`;
            string += `SUMMARY:${this.summary}`;
            string += `LAST-MODIFIED:${this['last-modified']}`;
            string += `CLASS:${this['class']}`;
            string += `UID:${this.uid}`;
            string += "END:VEVENT";
            return ICAL.Component.fromString(string);
        }
    },
    static: {
        fromThings(json) {
            json = Object.assign({}, json);
            json.provider = {
                name: 'things',
                id: json.id
            };

            json.tasks = json.todos.map(Task.fromThings, Task);
            delete json.id;
            delete json.todos;
            return Area(json);
        }
    }
});

// TODO use mobx state tree to models
var areable = stampit({
    props: {
        impact: 1,
        responsibilities: []
    },
    methods: {
      // TODO Render one calendar for area
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
      },
      toJSON () {
        return _.merge(
          {responsibilities: this.responsibilities.concat([])},
          _.omit(this, 'ocurrences', _.functionsIn(this))
        );
      }
    },
    static: {
        fromThings(json) {
            // duplicate objects
            json = Object.assign({}, json);

            !json.id && console.error('area.fromThings: Unable to found identifier for provided data, data:', json)

            json.provider = {
                name: 'things',
                id: json.id
            };

            json.tasks = json.todos || [];

            delete json.id;
            delete json.todos;
            return Area(json);
        }
    }
}),
    Area = differentiable.compose(areable);

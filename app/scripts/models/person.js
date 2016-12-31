var personable = stampit({
    methods: {
      // toICALString () {
      //   var string = "BEGIN:VEVENT";
      //   string += `DTSTART;VALUE=${this.dtstart.toICALDate()}`;
      //   string += `DTEND;VALUE=${this.dtend.toICALDate()}`;
      //   // string += `DTSTAMP:${this.dtstamp}`;
      //   string += `DESCRIPTION:${this.description}`;
      //   string += `SUMMARY:${this.summary}`;
      //   string += `LAST-MODIFIED:${this['last-modified']}`;
      //   string += `CLASS:${this['class']}`;
      //   string += `UID:${this.uid}`;
      //   string += "END:VEVENT";
      //   return ICAL.Component.fromString(string);
      // },
      toJSON () {
        return _.omit(this, _.functionsIn(this));
      }
    },
    static: {
        fromFoursquare(json) {
          json = Object.assign({}, json);

          json.provider = {
            id: json.id,
            name: 'foursquare'
          }

          let name      = [json.firstName, json.lastName || ''].join(' ')

          json.profile  = {
            names: [name],
            picture: json.photo.prefix + json.photo.suffix
          }

          delete json.id
          delete json.followingRelationship
          delete json.firstName
          delete json.lastName
          
          return Person(json);
        }
    }
}),
    Person = differentiable.compose(personable);

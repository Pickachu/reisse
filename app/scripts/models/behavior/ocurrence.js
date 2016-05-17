'use strict';

Date.prototype.toICALDate = function () {
    return this.toISOString().slice(0, 10).replace(/-/g, '')
};
// TODO
// Date.prototype.toICALDateTime = => {
//     return this.toISODate().slice(0, 10).replace('-', '')
// }

var ocurrenceable = stampit({
    methods: {
        incorporate () {
            this.chance = this.features.chance.estimated;
        },
        toICALString () {
            var string = "BEGIN:VEVENT";
            string += `DTSTART;VALUE=${this.start.toICALDate()}`;
            string += `DTEND;VALUE=${this.end.toICALDate()}`;
            //string += `DTSTAMP:${this.dtstamp}`; convert date to stamp
            string += `DESCRIPTION:${this.description}`;
            string += `SUMMARY:${this.summary}`;
            string += `LAST-MODIFIED:${this.updatedAt}`;
            string += `CLASS:${this['class']}`;
            string += `UID:${this.provider.id}`;
            string += "END:VEVENT";
            return ICAL.Component.fromString(string);
        }
    },
    static: {
        fromICalendar (json) {
            json = Object.assign({}, json);
            json.provider = {
                name: 'i-calendar',
                id: json.uid
            };

            // Every event in the past ocurred, so they are true!
            json.actualChance = 1;

            delete json.uid

            return Ocurrence(json);
        },
        fromJSON (json) {
            json = Object.assign({}, json);

            json.start       && (json.start       = new Date(json.start));
            json.end         && (json.end         = new Date(json.end  ));

            let provider = json.provider ? json.provider.name : 'none'
            switch (provider) {
              case 'asana':
              case 'things':
                return Task.fromJSON(json);
              case 'jawbone':
                // TODO implement activity types
                return Activity.fromJSON(json);
              default:
                return Ocurrence(json);
            }
        }
    }
});

var Ocurrence = Behavior.compose(ocurrenceable);

'use strict';

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
            string += `LAST-MODIFIED:${this['last-modified']}`;
            string += `CLASS:${this['class']}`;
            string += `UID:${this.uid}`;
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
            json.start       && (json.start = new Date(json.start));
            return Ocurrence(json);
        }
    }
});

var Ocurrence = stampit.compose(Behavior, ocurrenceable);

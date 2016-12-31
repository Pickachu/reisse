'use strict';

Date.prototype.toICALDate = function () {
    return this.toISOString().slice(0, 10).replace(/-/g, '')
};
// TODO
// Date.prototype.toICALDateTime = => {
//     return this.toISODate().slice(0, 10).replace('-', '')
// }

var ocurrenceable = stampit({
  init() {
    // FIXME this code assumes all ocurrences on a i-calendar are behaviors,
    // reisse must learn the diference between behaviors (running, eating) and events (birthday party, rock concert, etc)!
    if (this.provider.name === 'i-calendar') {
      if (!this.features.duration || !this.features.duration.actual) {
        this.features.duration || (this.features.duration = {});

        var time = ICAL.Time.fromJSDate,
        duration = time(this.end).subtractDate(time(this.start));

        if (Number.isFinite(duration.toSeconds()) || duration.toSeconds() < 0) {
          this.features.duration = {actual: duration.toSeconds()};

          if (duration.toSeconds() == 0) {
            console.warn(this.__firebaseKey__, 'Ocurrence.init: computed i-calendar duration is 0, falling back to one pomodoro.');
            this.features.duration.actual = 25 * 60 * 60
          }
        } else {
          console.warn(this.__firebaseKey__, 'Ocurrence.init: failed to compute duration with dates:', this.start, this.end);
        }
      }
      Object.assign(this.features, Feature.many(this, 'duration', 'brainCycles', 'sleepiness', 'hunger'));
    }

  },

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
    // For now all events are from google calendar
    // Representation: https://developers.google.com/google-apps/calendar/v3/reference/events#resource-representations
    fromICalendar (json) {
      json = Object.assign({}, json);
      json.provider = {
          name: 'i-calendar',
          id: json.id,
          calendarId: json.calendarId
      };


      if (json.recurringEventId) {
        json.provider.recurringEventId = json.recurringEventId;
      }

      json.summary && (json.name      = json.summary);
      json.created && (json.createdAt = new Date(Date.parse(json.created)));
      json.updated && (json.updatedAt = new Date(Date.parse(json.updated)));
      json.start   && (json.start     = new Date(Date.parse(json.start.dateTime || json.start.date)));
      json.end     && (json.end       = new Date(Date.parse(json.end.dateTime   || json.end.date)));

      // FIXME this line assumes all ocurrences on a i-calendar are behaviors,
      // reisse must learn the diference between behaviors (running, eating) and events (birthday party, rock concert, etc)!
      if (json.start && json.end){
        var time = ICAL.Time.fromJSDate,
        duration = time(json.end).subtractDate(time(json.start));
        json.features = {
          duration: {
            actual: duration.toSeconds()
          }
        };
      }

      delete json.id
      delete json.organizer
      delete json.creator
      delete json.etag
      delete json.htmlLink
      delete json.hangoutLink
      delete json.iCalUID
      delete json.kind
      delete json.remiders
      delete json.summary
      delete json.created
      delete json.updated
      delete json.timeZone
      delete json.gadget
      delete json.originalStartTime
      delete json.recurringEventId

      // TODO parse reminders
      delete json.reminders

      return Ocurrence(json);
    },
    fromJSON (json) {
      json = _.cloneDeep(json);

      json.start       && (json.start       = new Date(json.start));
      json.end         && (json.end         = new Date(json.end  ));

      let provider = json.provider ? json.provider.name : 'none'

      switch (provider) {
        case 'asana':
        case 'things':
          return Task.fromJSON(json);
        case 'jawbone':
          // Current pure activity types: sleep, meal
          return Activity.fromJSON(json);
        case 'i-calendar':
          // TODO better checking for this
          if (json.end > Date.now()) {
            json.status = 'open';
          } else {
            json.status = 'complete';
          }
          return Ocurrence(json);
        default:
          return Ocurrence(json);
      }
    }
  }
});

var Ocurrence = Behavior.compose(ocurrenceable, awarable);

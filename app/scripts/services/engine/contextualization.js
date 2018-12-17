/* globals Estimator, Classifier  */
/* exports Re.Contextualization */

'use strict';

const Traveler = stampit({
  init({instance, args: [range]}) {
    instance.range = range;
    // TODO make traveler.cursor a private and imutable variable
    instance.cursor = moment(range[0]);
    instance.available = this._computeAvailableTime(range);
  },
  props: {
    needsForwarding: true,
  },
  methods: {
    reduce(reducer, accumulator) {
      return Context()
        .for(this.cursor.toDate())
        .then(this.__logContext.bind(this))
        .then((context) => reducer(accumulator, context, this))
        .then((accumulated) => {
          if (this.available > 0) {
            if (this.needsForwarding) {
              throw new TypeError(`Traveler.forward: must be called.`);
            }
            this.needsForwarding = true;

            return this.reduce(reducer, accumulated);
          } else {
            return accumulated;
          }
        });
    },

    forward(step) {
      if (!step || step < 0) {
        throw new TypeError(`Traveler.forward: advance step must be a positive integer. '${step}' given`);
      }

      if (!this.needsForwarding) { throw new TypeError(`Traveler.forward: cannot be called twice`); }

      this.needsForwarding = false;
      this.cursor.add(step, 'milliseconds');
      return this.available -= step;
    },

    __logContext(context) {
      let message = ["Context"];
      message.push("  Now       : " + context.calendar.now);
      message.push("  Location  : " + context.location.latitude + ' lat ' + context.location.longitude + ' lon');
      message.push("  People    : " + _(context.people).map('profile.names.0').compact().value());
      message.push("  Sleepiness: " + context.sleepiness);
      message.push(" Meta ");
      message.push("  Available Time: " + moment.duration(this.available).asSeconds() + 's');
      console.log(message.join('\n'));
      return context;
    },

    // TODO move to context
    // TODO compute available time from past, and from already defined events
    // TODO use moment instead of ICAL
    // For now, give 2 days of available time, later get available time from timerange param
    _computeAvailableTime (range) {
      let oneDay = ICAL.Duration.fromSeconds(2 * 24 * 60 * 60), midnight = ICAL.Time.now(), available;

      midnight.hour  = midnight.minute = midnight.second = 0;
      midnight.addDuration(oneDay);
      available      = midnight.subtractDate(ICAL.Time.now()).toSeconds();

      return available * 1000;
    }
  }
})


Re.Contextualization = stampit({
  static: {

    _computeTimeTraveler(range) { return Traveler(null, range); },

    // For now, compute timslice returns only the current day range
    // TODO make it compute teh current viewing range for the user on calendar
    _computeTimeslice () {
      return [
        moment().startOf('day').toDate(),
        moment().startOf('day').add(1, 'day').toDate()
      ];
    },

  }
});

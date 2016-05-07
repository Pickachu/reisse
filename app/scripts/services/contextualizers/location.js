'use strict';


Context.add(stampit({
  refs: {
    name: 'location'
  },
  methods: {
    contextualize (context) {
      let provider = document.createElement('geo-location');

      return new Promise((resolve, reject) => {
        let listener = function (event, detail) {
          this.removeEventListener('geo-response' , listener);
          context.location = _.omit(this.position.coords, _.isNull);
          resolve(context);
        };

        provider.addEventListener('geo-response' , listener);
        provider.addEventListener('geo-error' , reject);
      });
    }
  }
}));

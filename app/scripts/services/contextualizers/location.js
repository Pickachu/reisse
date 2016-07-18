'use strict';


Context.add(stampit({
  refs: {
    name: 'location'
  },
  methods: {
    contextualize (context) {
      let provider, fetch = () => {
        provider = document.createElement('geo-location');
        provider.addEventListener('geo-response' , listener);

      }, listener = function (event, detail) {

        this.removeEventListener('geo-response' , listener);
        context.location = _.omit(this.position.coords, _.isNull);
        contextualized(context);

      }, contextualized;



      fetch();

      return new Promise((resolve, reject) => {
        contextualized = resolve;

        provider.addEventListener('geo-error' , () => {
          // Retry once!
          fetch();
          console.log('contextualizer', this.name, 'failed, trying.');
          provider.addEventListener('geo-error', reject);
        });
      });
    }
  }
}));

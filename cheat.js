// Erase occurrences by provider name
ref = new Firebase(app.location).child('lore/ocurrences');
ref
  .orderByChild('provider/name')
  .equalTo('youtube')
  // Will create a loop that deletes records
  .on('child_added', (snap, i) => {
    console.log(snap.key(), snap.val());
    if (!snap.val().updatedAt) {
      console.log('would update', snap.val().name);
      snap.ref().child('updatedAt').set(snap.val().createdAt);
    }
    // snap.ref().remove();
  });


// List occurrences by criteria
ref = new Firebase(app.location).child('lore/ocurrences');
update = {};
ref
  .on('child_added', (snap, i) => {
    const occurrence = snap.val();
    if (!duration) console.log('skip durationless', occurrence.name);
    console.log(snap.key(), occurrence.name);

    if (isFinite(duration[key])) {
      const value = duration[key] * 1000;
      const fbKey = [snap.key(), 'features', 'duration', key].join('/')
      console.log('would update', fbKey, duration[key], '➜', value);
      update[fbKey] = value;
    } else {
      throw new TypeError('non finite duration key!', key)
    }

    // snap.ref().remove();
  });

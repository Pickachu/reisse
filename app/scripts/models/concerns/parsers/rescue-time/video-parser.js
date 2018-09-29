RescueTime.scrapers.push({
  canScrape({activity}) {
    return activity === 'youtube.com';
  },
  // TODO threat '(40) YouTube' title
  cleanings: [
    // TODO figure out what is this weird char coming from rescue time
    [/ �/g, ''],
    // Removes pending notification count from starting titles
    [/^\(\d+\) /, ''],
    // Removes trailing YouTube qualifier
    [/ - YouTube$/, ''],
  ],
  scrape(row) {
    return Object.assign({}, row, {
      document: this.cleanings.reduce((document, cleaning) =>
        document.replace.apply(document, cleaning)
      , row.document)
    });
  }
});



RescueTime.parsers.push({
  summary: 'Youtube Document Activity Parser',

  canParse(rows) {
    return rows.some(({category, activity}) => category === 'Video' && activity === 'youtube.com');
  },

  IGNORED_TITLES: [
    // Internal Pages
    'YouTube',
    'Watch Later Playlist',
    'History',

    // Unknown documents
    'No Details',
    'Untitled',
  ],

  parse(rows, rescueTime) {
    return _(rows)
      .filter(({category, activity}) => category === 'Video' && activity === 'youtube.com')
      // Cleanup records for improved grouping
      .thru(rescueTime._scrapeRows.bind(rescueTime))
      // Group all video row activities by title for further document merging
      .groupBy('document')
      .toPairs()
      // Merge all video activity records into a highier order activity item
      .map(([title, records]) => [ title, this.groupByTimeBlock(records) ] )
      // Identify witch activity items represents this parsers responsibilities
      .filter(([title]) => !this.IGNORED_TITLES.includes(title))
      .map(([title, items]) => items)
      .flatten()
      .value();
  },

  /**
   * Groups rescue time records by a given time block
   *
   * Given a set of upgraded rescue time documents, take consecutive records
   * through time with at most {timeBlock} minutes and merge them into an grouping
   * item
   *
   * Tip: group records by document title before using this method for maximum profit
   *
   * TODO on grouping, also average productivty of different items
   *
   * @param  {[type]} records   records to be grouped
   * @param  {Number} timeBlock maximum of minutes to group records by
   *
   * @return {item[]}          collection of grouped items
   */
  groupByTimeBlock(records, timeBlock) {
    timeBlock || (timeBlock = 5);

    return records
      // Guarantees that each record group for merge is sorted through time
      .sort((a, b) => a.date.valueOf() - b.date.valueOf())
      // Merges all records that 5 minutes near of each other
      .reduce((items, record, index, records) => {
        const previous = records[index - 1];

        if (previous) {
          const difference = record.date.diff(previous.date, 'minutes');

          // Difference is 0 for duplicated records
          if (difference <= timeBlock) {
            items[0] = Object.assign(items[0], previous, {
              start: moment.min(items[0].start, previous.date),
              end: record.date.clone().add(timeBlock, 'minutes'),
              time_spent: items[0].time_spent.add(record.time_spent),
            });
          } else {
            items.unshift(Object.assign({}, record, {
              start: record.date,
              end: record.date.clone().add(timeBlock, 'minutes')
            }));
          }

        } else {
          items.unshift(Object.assign({}, record, {
            start: record.date,
            end: record.date.clone().add(timeBlock, 'minutes')
          }));
        }

        return items;
      }, [])

      // since we unshift, return records in reverse order to sort
      .reverse()
  }

});

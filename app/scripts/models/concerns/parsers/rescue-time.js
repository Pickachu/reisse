// RescueTime to Reissë type converter
// https://www.rescuetime.com/anapi/setup/documentation#analytic-api-reference

const RescueTime = {
  parsers: [],
  normalizeRows (rows) {
    const upgraded = this._upgradeRows(rows);
    return this.parsers.reduce((parsed, parser) => {
      return parser.canParse(upgraded) ? parser.parse(upgraded, this) : parsed;
    }, []);
  },

  _upgradeRows(rows) {
    return rows.map((row) => Object.assign({}, row, {
      date: moment(row.date),
      time_spent: moment.duration(row.time_spent_seconds, 'seconds')
    }));
  },

  // Activity data normalizer
  scrapers: [],
  _scrapeRows (rows, parser) {
    return rows.map((row, index) =>
      this.scrapers.reduce((row, scraper) => {
        return scraper.canScrape(row) ? scraper.scrape(row, index, rows, parser, this) : row;
      }, row)
    );
  },
};

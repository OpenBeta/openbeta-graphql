const list = require('./tmp-list.json')
const _ = require('underscore')

const l = list.map(entry => ({
  alpha3: entry['Alpha-3 code'],
  lnglat: [entry['Longitude (average)'], entry['Latitude (average)']]
}))

const obj = _.indexBy(l, 'alpha3')
console.log(JSON.stringify(obj, null, 2))

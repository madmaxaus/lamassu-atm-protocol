'use strict';

var http = require('http');

var FOREX_URI = 'http://api.apirates.com/api/update';

var ApiRates = function(config) {
  this.config = config;
};
ApiRates.factory = function factory(config) {
  return new ApiRates(config);
};

ApiRates.prototype.fetch = function fetch(currency, cb) {
  var self = this;
  http.get(FOREX_URI, function(res) {
    var buf = '';
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      buf += chunk;
    })
    .on('end', function() {
      var json = null;
      try {
        json = JSON.parse(buf);
      } catch(e) {
        cb(new Error('Couldn\'t parse JSON response'));
        return;
      }
      var rate = null;
      var straightRate = json.ticks['USD' + currency];
      if (straightRate) rate = parseFloat(straightRate);
      else {
        var invertedRate = json.ticks[currency + 'USD'];
        if (!invertedRate) {
          cb(new Error('Currency not listed: ' + currency));
          return;
        }
        rate = 1 / parseFloat(invertedRate);
      }
      cb(null, rate);
    });
  }).on('error', function(e) {
    cb(e);
  });
};

module.exports = ApiRates;

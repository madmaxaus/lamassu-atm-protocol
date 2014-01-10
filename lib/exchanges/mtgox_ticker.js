'use strict';

var https = require('https');

var MtGoxTicker = function(config) {
  this.config = config;
};

MtGoxTicker.factory = function factory(config) {
  return new MtGoxTicker(config);
};

MtGoxTicker.prototype.ticker = function ticker(currency, cb) {
  var self = this;
  https.get(this.config.uri, function(res) {
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

      if (json.data.buy.currency !== currency)
        return cb(new Error('Currency not listed: ' + currency));

      var rate = json.data.sell.value;
      cb(null, rate);
    });
  }).on('error', function(e) {
    cb(e);
  });
};

module.exports = MtGoxTicker;

'use strict';

var https = require('https');
var _ = require('underscore');

var URI = 'https://bitpay.com/api/rates';

var BitpayTicker = function(config) {
  this.config = config;
};

BitpayTicker.factory = function factory(config) {
  return new BitpayTicker(config);
};

BitpayTicker.prototype.ticker = function ticker(currency, cb) {
  var self = this;
  https.get(URI, function(res) {
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
      var rec = _.findWhere(json, {code: currency});

      if (!rec) {
        cb(new Error('Currency not listed: ' + currency));
        return;
      }
      cb(null, rec.rate);
    });
  }).on('error', function(e) {
    cb(e);
  });
};

module.exports = BitpayTicker;

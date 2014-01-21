'use strict';

var http = require('http');
var winston = require('winston');
var logger = new (winston.Logger)({transports:[new (winston.transports.Console)()]});

var OpenExchangeRates = function(config) {
  this.config = config;
};
OpenExchangeRates.factory = function factory(config) {
  return new OpenExchangeRates(config);
};

OpenExchangeRates.prototype.fetch = function fetch(currency, cb) {
  var self = this;
  var apiKey = this.config.apiKey;
  var forexUri = 'http://openexchangerates.org/api/latest.json?app_id=' + apiKey;
  http.get(forexUri, function(res) {
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
      var straightRate = json.rates[currency];
      if (straightRate) rate = parseFloat(straightRate);
      else {
        cb(new Error('Currency not listed: ' + currency));
        return;
      }
      cb(null, rate);
    });
  }).on('error', function(e) {
    logger.error('forex error: %j', e);
    cb(e);
  });
};

module.exports = OpenExchangeRates;

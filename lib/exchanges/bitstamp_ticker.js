'use strict';

var BitstampTickerClient = require('bitstamp');
var async = require('async');

var BitstampTicker = function() {
  this.client = new BitstampTickerClient();
};

BitstampTicker.factory = function factory() {
  return new BitstampTicker();
};

BitstampTicker.prototype.ticker = function ticker(currency, callback) {
  if (currency === 'USD') {
    this.client.ticker(function(err, json) {
      if (err) return callback(err);
      callback(null, json.ask);
    });
  } else if (currency === 'EUR') return this._eurTicker(callback);
  else callback(new Error('Currency not listed: ' + currency));
};

BitstampTicker.prototype._eurTicker = function _eurTicker(callback) {
  async.parallel([
      this.client.ticker,
      this.client.eur_usd
    ],
    function(err, results) {
      if (err) return callback(err);
      callback(null, results[0].ask / results[1].sell);
    }
  );
};

module.exports = BitstampTicker;

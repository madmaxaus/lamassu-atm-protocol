'use strict';

require('date-utils');
var winston = require('winston');
var logger = new (winston.Logger)({transports:[new (winston.transports.Console)()]});

var _tickerExchange;
var _api;
var _rates = {};
var _err = null;

var pollRate = function(currency, cb) {
  logger.info('polling for rate...');
  _tickerExchange.ticker(currency, function(err, rate) {
    _err = err;
    if (err && cb) { return cb(err); }
    _rates[currency] = {rate: rate, ts: new Date()};
    if (cb) cb(null, _rates[currency].rate);
  });
};

exports.init = function(config, api, tickerExchange) {
  _api = api;
  _tickerExchange = tickerExchange;

  pollRate(config.settings.currency);
  setInterval(function () {
    pollRate(config.settings.currency);
  }, 60 * 1000);
};

exports.rate = function(currency, cb) {
  if (!_rates[currency]) return cb(_err, null);
  cb(_err, _rates[currency].rate);
};

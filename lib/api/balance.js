'use strict';

var _transferExchange;
var _tradeExchange;
var _api;
var _config;
var _balance;

var winston = require('winston');
var logger = new (winston.Logger)({transports:[new (winston.transports.Console)()]});

var async = require('async');

exports.init = function(config, api, transferExchange, tradeExchange) {
  _api = api;
  _config = config;

  _transferExchange = transferExchange;
  _tradeExchange = tradeExchange;

  exports.balanceTriggers = [function (cb) { _transferExchange.balance(cb); }];

  if (tradeExchange)
    exports.balanceTriggers.push(function(cb) { _tradeExchange.balance(cb); });
};

exports.balanceTrigger = function(cb) {
  logger.info('collecting balance');

  async.parallel(exports.balanceTriggers, function(err, results) {
    exports._balanceHandler(err, results, cb);
  });
};

exports._balanceHandler = function(err, results, cb) {
  if (err) return cb(err);
  _balance = {
    transferBalance: results[0],
    tradeBalance: results.length === 2 ? results[1] : null
  };
  cb(err, _balance);

  logger.info('Balance update: %d', _balance);
};

exports.setDomain = function(domain) {
  _transferExchange.setDomain(domain);
};

exports.balance = function(cb) {
  exports.balanceTrigger(cb);
};

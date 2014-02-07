var _transferExchange;
var _tradeExchange;
var _api;
var _config;
var _balance;
var winston = require('winston');

var logger = new (winston.Logger)({transports:[new (winston.transports.Console)()]});

/*
 * Initialize balance polling from transfer
 */

exports.init = function(config, api, transferExchange, tradeExchange) {
  _api = api;
  _config = config;

  _transferExchange = transferExchange;
  _tradeExchange = tradeExchange;

  exports.balanceTriggers = [function (cb) { _transferExchange.balance(cb); }];

  if (tradeExchange)
    exports.balanceTriggers.push(function(cb) { _tradeExchange.balance(cb); });
};

/*
 * Collect balance from transfer
 */

exports.balanceTrigger = function(cb) {
  var results = [];

  logger.info('collecting balance');

  exports.balanceTriggers[0](function(err, result) {
    results.push(result);

    if (!exports.balanceTriggers[1])
      return exports._balanceHandler(err, results, cb);

    exports.balanceTriggers[1](function(err, result) {
      results.push(result);

      exports._balanceHandler(err, results, cb);
    });
  });
};

/*
 * Balance data handler
 */

exports._balanceHandler = function(err, results, cb) {
  if (err) {
    cb(err);
  } else {
    _balance = {
      transferBalance: results[0],
      tradeBalance: results[1] || null
    };

    cb(err, _balance);
  }

  logger.info('Balance update: %j', _balance);
};


exports.setDomain = function(domain) {
  _transferExchange.setDomain(domain);
};

/*
 * Main API endpoint
 */

exports.balance = function(cb) {
  exports.balanceTrigger(cb);
};
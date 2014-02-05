/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
/*
 * read ticker value from memory, if ticker counter has expired then refetch
 */

'use strict';

require('date-utils');
//var async = require('async');
var winston = require('winston');
var logger = new (winston.Logger)({transports:[new (winston.transports.Console)()]});
var path = require('path');

var _transferExchange;
var _tickerExchange;
var _tradeExchange;
var _rates = {};
var _config;
var _comission;
var _balanceTriggers;
var _balanceRetries = 0;
var _exchangeRate = 0;
var _balance = null;
var _config;
var SATOSHI_FACTOR = Math.pow(10, 8);

exports.ticker = require('./ticker');
exports.trade = require('./trade');
exports.send = require('./send');
exports.balance = require('./balance');
exports._tradeExchange = null;
exports._transferExchange = null;


exports.findExchange = function (name) {
  var exchange;

  try {
    exchange = require('lamassu-' + name);
  } catch (err) {
    exchange = require(path.join(path.dirname(__dirname), 'exchanges', name));
  }

  return exchange;
};


exports.findTicker = function (name) {
  var exchange = exports.findExchange(name);
  return exchange.ticker || exchange;
};


exports.findTrader = function (name) {
  var exchange = exports.findExchange(name);
  return exchange.trader || exchange;
};


exports.findWallet = function (name) {
  var exchange = exports.findExchange(name);
  return exchange.wallet || exchange;
}


/**
 * initialize exchanges
 */
exports.init = function(config) {
  _config = config;

  var tickerExchangeCode = config.plugins.current.ticker;
  var tickerExchangeConfig = config.plugins.settings[tickerExchangeCode] || {};
  tickerExchangeConfig.currency = config.settings.currency;
  _tickerExchange = exports.findTicker(tickerExchangeCode).factory(tickerExchangeConfig);

  var tradeExchangeCode = config.plugins.current.trade;
  if (tradeExchangeCode) {
    var tradeExchangeConfig = config.plugins.settings[tradeExchangeCode];
    _tradeExchange = exports.findTrader(tradeExchangeCode).factory(tradeExchangeConfig);
  }

  var transferExchangeCode = config.plugins.current.transfer;
  var transferExchangeConfig = config.plugins.settings[transferExchangeCode];
  _comission = config.settings.commission;
  _transferExchange = exports.findWallet(transferExchangeCode).factory(transferExchangeConfig);

  _balanceTriggers = [function(cb) { _transferExchange.balance(cb); }];
  var doRequestTradeExchange = _tradeExchange && tradeExchangeCode !== transferExchangeCode;

  exports._tradeExchange = _tradeExchange;
  exports._transferExchange = _transferExchange;
  exports.ticker.init(config, exports, _tickerExchange);
  exports.trade.init(config, exports, _tradeExchange, exports.ticker);
  exports.send.init(config, exports, _transferExchange, exports.ticker);
  exports.balance.init(config, exports, _transferExchange,
                       doRequestTradeExchange ? _tradeExchange : null);

  /*setInterval(function() {
    exports.balanceTrigger();
  }, _config.settings.balanceInterval);*/
};



/**
 * return fiat balance
 */
exports.fiatBalance = function(transferSatoshis, tradeFiat) {
  if (!_exchangeRate || !_balance) return 0;

  var lowBalanceMargin = _config.settings.lowBalanceMargin;
  var adjustedTransferBalance = _balance.transferBalance - transferSatoshis;
  var fiatTransferBalance = ((adjustedTransferBalance / SATOSHI_FACTOR) * _exchangeRate) / lowBalanceMargin;
  var tradeBalance = _.balance.tradeBalance;

  if (tradeBalance === null) return fiatTransferBalance;
  var adjustedFiat = tradeFiat + trade.queueFiatBalance(_exchangeRate);
  var fiatTradeBalance = (tradeBalance - adjustedFiat) / lowBalanceMargin;

  return Math.min(fiatTransferBalance, fiatTradeBalance);
};



var _balanceHandler = function(err, results) {
  if (err) {
    _balanceRetries += 1;
  }
  else {
    _balanceRetries = 0;
    var satoshis = results[0];
    var fiat = _tradeExchange ? results[1] : null;
    _balance = {transferBalance: satoshis, tradeBalance: fiat};
  }
  logger.info('Balance update: %j', _balance);
};


exports.balanceTrigger = function() {
  var results = [];

  logger.info('checking balance');

  _balanceTriggers[0](function(err, result) {
    results.push(result);

    if (!_balanceTriggers[1])
      return _balanceHandler(err, results);

    _balanceTriggers[1](function(err, result) {
      results.push(result);
      _balanceHandler(err, results);
    });
  });
};

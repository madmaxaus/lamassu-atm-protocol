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
require('lamassu-bitpay');
require('lamassu-bitstamp');
require('lamassu-blockchain');


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
};



exports.balanceTrigger = function(cb) {
  exports.balance.balanceTrigger(cb);
};



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

  var doRequestTradeExchange = _tradeExchange && tradeExchangeCode !== transferExchangeCode;

  exports._tradeExchange = _tradeExchange;
  exports._transferExchange = _transferExchange;
  exports.ticker.init(config, exports, _tickerExchange);
  exports.trade.init(config, exports, _tradeExchange, exports.ticker);
  exports.send.init(config, exports, _transferExchange, exports.ticker);
  exports.balance.init(config, exports, _transferExchange,
                       doRequestTradeExchange ? _tradeExchange : null);
};



/**
 * return fiat balance
 *
 * in input to this function, balance has the following parameters...
 *
 * balance.transferBalance - in satoshis
 * balance.tradeBalance    - in USD
 *
 * Have added conversion here, but this really needs to be thought through, lamassu-bitstamp should perhaps
 * return balance in satoshis
 */
exports.fiatBalance = function(rate, balance, transferSatoshis, tradeFiat, callback) {
  if (!rate || !balance) return 0;

  var lowBalanceMargin = _config.settings.lowBalanceMargin;
  var adjustedTransferBalance = balance.transferBalance - transferSatoshis;
  var fiatTransferBalance = adjustedTransferBalance / lowBalanceMargin;

  if (balance.tradeBalance === null) return fiatTransferBalance;
  var tradeBalance = (balance.tradeBalance * SATOSHI_FACTOR) / rate;
  var adjustedFiat = tradeFiat + exports.trade.queueFiatBalance(rate);
  var fiatTradeBalance = (tradeBalance - adjustedFiat) / lowBalanceMargin;

  return Math.min(fiatTransferBalance, fiatTradeBalance);
};



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

'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('lodash');
var async = require('async');

var SATOSHI_FACTOR = Math.pow(10, 8);

var _tradeExchange;

exports.init = function(tradeExchange) {
  _tradeExchange = tradeExchange;
}


/**
 * bit coin purchase logic
 */
exports.purchase = function(trade) {
  var self = this;
  _tradeExchange.purchase(trade, function() {
    self._balanceTrigger();
  });
};








var Trader = function(config) {
  EventEmitter.call(this);
  this.config = config;
  this.child = null;
  this.exchangeRate = null;
  this.balance = null;
  this.callbacks = {};
  this.restartFlag = false;
  this.tradeQueue = [];

  this.exchange = null;
  this.balanceTimer = null;
  this.balanceRetries = 0;
  this.balanceTriggers = null;
  this.tickerExchange = null;
  this.transferExchange = null;
  this.tickerTimer = null;
  this.tickerRetries = 0;

  this.loadModules();
};

Trader.factory = function factory(config) {
  return new Trader(config);
};
util.inherits(Trader, EventEmitter);

Trader.prototype.loadModules = function loadModules() {
  var self = this;
  var config = this.config;
  var tickerExchangeCode = config.plugins.current.ticker;
  var tradeExchangeCode = config.plugins.current.trade;
  var transferExchangeCode = config.plugins.current.transfer;
  var tickerExchangeConfig = config.plugins.settings[tickerExchangeCode] || {};

  if (tradeExchangeCode) {
    var tradeExchangeConfig = config.plugins.settings[tradeExchangeCode];
    this.tradeExchange = require('./exchanges/' + tradeExchangeCode).
      factory(tradeExchangeConfig);
  }

  var transferExchangeConfig = config.plugins.settings[transferExchangeCode];
  this.commission = config.settings.commission;
  tickerExchangeConfig.currency = config.settings.currency;
  this.tickerExchange = require('./exchanges/' + tickerExchangeCode).
    factory(tickerExchangeConfig);
  this.transferExchange = require('./exchanges/' + transferExchangeCode).
    factory(transferExchangeConfig);

  this.balanceTriggers = [function(cb) { self.transferExchange.balance(cb); }];
  var doRequestTradeExchange = this.tradeExchange &&
      tradeExchangeCode !== transferExchangeCode;
  if (doRequestTradeExchange)
    this.balanceTriggers.push(function(cb) { self.tradeExchange.balance(cb); });
};

Trader.prototype.run = function run() {
  var self = this;
  var tickerCount = 0;
  var balanceCount = 0;
  var fastPollLimit = this.config.settings.fastPollLimit;
  var fastPoll = this.config.settings.fastPoll;

  // Faster polling on startup
  async.whilst(
    function() {
      tickerCount += 1;
      return self.exchangeRate === null && tickerCount <= fastPollLimit;
    },
    function(cb) {
      setTimeout(function() { self._tickerTrigger(); cb(); }, fastPoll);
    },
    _.noop
  );
  async.whilst(
    function() {
      balanceCount += 1;
      return self.balance === null && balanceCount <= fastPollLimit;
    },
    function(cb) {
      setTimeout(function() { self._balanceTrigger(); cb(); }, fastPoll);
    },
    _.noop
  );

  setInterval(function() {
    self._executeTrades();
  }, this.config.settings.tradeInterval);

  setInterval(function() {
    self._tickerTrigger();
  }, this.config.settings.tickerInterval);

  setInterval(function() {
    self._balanceTrigger();
  }, this.config.settings.balanceInterval);
};

Trader.prototype.sendBitcoins = function sendBitcoins(address, satoshis, cb) {
  var self = this;
  this.transferExchange.sendBitcoins(address, satoshis,
      this.config.settings.transactionFee, function(err, tx) {
    cb(err, tx);
    self._balanceTrigger();
  });
};

Trader.prototype.trigger = function trigger() {
  this._tickerTrigger();
  this._balanceTrigger();
};

Trader.prototype._tickerTrigger = function tickerTrigger() {
  var self = this;
  this.tickerExchange.ticker(function(err, rate) {
    self._tickerHandler(err, rate);
  });
};

Trader.prototype._balanceTrigger = function balanceTrigger() {
  var self = this;

  async.parallel(this.balanceTriggers,
    function(err, results) {
      self._balanceHandler(err, results);
    }
  );
};

Trader.prototype.fiatBalance =
    function fiatBalance(transferSatoshis, tradeFiat) {
  if (!this.exchangeRate || !this.balance) return 0;

  var lowBalanceMargin = this.config.settings.lowBalanceMargin;
  var adjustedTransferBalance = this.balance.transferBalance - transferSatoshis;
  var fiatTransferBalance = ((adjustedTransferBalance / SATOSHI_FACTOR) *
      this.exchangeRate) / lowBalanceMargin;
  var tradeBalance = this.balance.tradeBalance;

  if (tradeBalance === null) return fiatTransferBalance;
  var adjustedFiat = tradeFiat + this._tradeQueueFiatBalance();
  var fiatTradeBalance = (tradeBalance - adjustedFiat) / lowBalanceMargin;

  return Math.min(fiatTransferBalance, fiatTradeBalance);
};

Trader.prototype.trade = function trade(rec) {
  this.tradeQueue.push(rec);
};

Trader.prototype._executeTrades = function _executeTrades() {
  if (!this.config.plugins.current.trader) return;

  var trade = this._consolidateTrades();

  if (trade.fiat === 0) return;
  if (trade.fiat < this.config.settings.minimumTradeFiat) {
    // throw it back in the water
    this.tradeQueue.unshift(trade);
    return;
  }

  console.log('making a trade: %d', trade.satoshis / Math.pow(10,8));
  this.purchase(trade);
};

Trader.prototype._consolidateTrades = function _consolidateTrades() {
  var queue = this.tradeQueue;
  var tradeRec = {
    fiat: 0,
    satoshis: 0
  };

  while (true) {
    var lastRec = queue.shift();
    if (!lastRec) break;
    tradeRec.fiat += lastRec.fiat;
    tradeRec.satoshis += lastRec.satoshis;
  }

  return tradeRec;
};

// Indicates how much fiat we'll need to cover pending trades
Trader.prototype._tradeQueueFiatBalance = function _tradeQueueFiatBalance() {
  var satoshis = _.reduce(this.tradeQueue, function(memo, rec) {
    return memo + rec.satoshis;
  }, 0);
  return (satoshis / SATOSHI_FACTOR) * this.exchangeRate;
};

Trader.prototype.purchase = function purchase(trade) {
  // TODO: add error reporting
  var self = this;
  this.tradeExchange.purchase(trade, function() {
    self._balanceTrigger();
  });
};

// Private functions

Trader.prototype._reportNetworkStatus = function _reportNetworkStatus() {
  var retries = this.config.settings.retries;
  var isNetworkDown =
      Math.max(this.tickerRetries, this.balanceRetries) > retries;

  var successfulRetrieval = this.balance !== null && this.exchangeRate !== null;
  if (isNetworkDown) this.emit('networkDown');
  else if (successfulRetrieval) this.emit('networkUp');
};

Trader.prototype._tickerHandler = function _tickerHandler(err, rate) {
  if (err)
    this.tickerRetries += 1;
  else {
    this.tickerRetries = 0;
    this.exchangeRate = rate * this.commission;
    this.emit('tickerUpdate');
    if (this.balance) this.emit('balanceUpdate');
  }

  this._reportNetworkStatus();
};

Trader.prototype._balanceHandler = function _balanceHandler(err, results) {
  if (err)
    this.balanceRetries += 1;
  else {
    this.balanceRetries = 0;
    var satoshis = results[0];
    var fiat = this.tradeExchange ? results[1] : null;
    this.balance = {transferBalance: satoshis, tradeBalance: fiat};
    this.emit('balanceUpdate');
  }

  this._reportNetworkStatus();
};

module.exports = Trader;

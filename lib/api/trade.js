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

var _tradeExchange;
var _ticker;
var _tradeQueue = [];
var _api;
var _config;

var SATOSHI_FACTOR = Math.pow(10, 8);


var _consolidateTrades = function() {
  var queue = _tradeQueue;
  var tradeRec = {
    fiat: 0,
    satoshis: 0,
    currency: 'USD'
  };

  while (true) {
    var lastRec = queue.shift();
    if (!lastRec) {
      break;
    }
    tradeRec.fiat += lastRec.fiat;
    tradeRec.satoshis += lastRec.satoshis;
    tradeRec.currency = lastRec.currency;
  }
  return tradeRec;
};



/**
 * TODO: add error reporting
 */
var _purchase = function(trade) {
  _ticker.rate(trade.currency, function(err, rate) {
    _tradeExchange.purchase(trade.satoshis, rate, function(err) {
      _api.balanceTrigger();
    });
  });
};



/**
 * initialize ticker library
 */
exports.init = function(config, api, tradeExchange, ticker) {
  _config = config;
  _api = api;
  _tradeExchange = tradeExchange;
  _ticker = ticker;

  setInterval(function() {
    exports.executeTrades();
  }, _config.settings.tradeInterval);


  setInterval(function() {
    exports.balanceTrigger();
  }, _config.settings.balanceInterval);
};



/**
 * register a trade for processing
 */
exports.trade = function(fiat, satoshis, currency) {
  _tradeQueue.push({fiat: fiat, satoshis: satoshis, currency: currency});
};



/**
 * Indicates how much fiat we'll need to cover pending trades
 */
exports.queueFiatBalance = function(exchangeRate) {
  var satoshis = _.reduce(_tradeQueue, function(memo, rec) {
    return memo + rec.satoshis;
  }, 0);
  return (satoshis / SATOSHI_FACTOR) * exchangeRate;
};



exports.executeTrades = function() {
  if (!_config.plugins.current.trade) {
    return;
  }

  var trade = _consolidateTrades();

  if (trade.fiat === 0) {
    return;
  }

  if (trade.fiat < _config.settings.minimumTradeFiat) {
    // throw it back in the water
    _tradeQueue.unshift(trade);
    return;
  }

  console.log('making a trade: %d', trade.satoshis / Math.pow(10,8));
  _purchase(trade);
};




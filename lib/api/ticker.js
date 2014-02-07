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
var winston = require('winston');
var logger = new (winston.Logger)({transports:[new (winston.transports.Console)()]});

var _tickerExchange;
var _api;
var _rates = {};
var _err = null;


var pollRate = function(currency, cb) {
  logger.info('polling for rate...')
  _tickerExchange.ticker(currency, function(err, rate) {
    _err = err;
    if (err && cb) { return cb(err); }
    _rates[currency] = {rate: rate, ts: new Date()};
    logger.info('rates: %j', _rates);
    if (cb) {
      cb(null, _rates[currency].rate);
    }
  });
};


/**
 * initialize ticker library
 */
exports.init = function(config, api, tickerExchange) {
  _api = api;
  _tickerExchange = tickerExchange;

  pollRate(config.settings.currency);
  setInterval(function () {
    pollRate(config.settings.currency);
  }, 60 * 1000);
};



/**
 * return ticker rates
 */
exports.rate = function(currency, cb) {
  if (!_rates[currency]) {
    pollRate(currency, function(err, rate) {
      cb(_err, rate);
    });
  }
  else {
    cb(_err, _rates[currency].rate);
  }
};



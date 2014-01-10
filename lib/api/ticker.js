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

var _tickerExchange;
var _rates = {};



/**
 * initialize ticker library
 */
exports.init = function(config) {
  var tickerExchangeCode = config.plugins.current.ticker;
  var tickerExchangeConfig = config.plugins.settings[tickerExchangeCode] || {};
  tickerExchangeConfig.currency = config.settings.currency;
  _tickerExchange = require('../exchanges/' + tickerExchangeCode).factory(tickerExchangeConfig);
};



/**
 * read ticker rates
 */
exports.pollRate = function(currency, cb) {
  var now = new Date();
  var reload = true;

  if (_rates[currency]) {
    var compareTs = _rates[currency].ts.clone();
    if (now.isBefore(compareTs.addMinutes(1))) {
      reload = false;
      cb(null, _rates[currency].rate);
    }
  }

  if (reload) {
    _tickerExchange.ticker(currency, function(err, rate) {
      if (err) { return cb(err); }
      _rates[currency] = {rate: rate, ts: new Date()};
      cb(null, rate);
    });
  }
};



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

var api = exports.api = require('./api/api');
var testMode = require('./testMode');
var herokuTest = require('./herokuTest');
var async = require('async');
var _config;

/**
 * read ticker
 * read ticker value from memory, if ticker counter has expired then re-fetch
 */
var poll = function(req, res) {
  async.parallel({
    rate: api.ticker.rate.bind(api.ticker, req.params.currency),
    satoshis: api.balance.balance.bind(api.balance)
  }, function(err, result) {
    console.dir(arguments);
    if (err)
      return res.json({err: err})

    res.json({
      err: null,
      rate: result.rate,
      fiat: api.fiatBalance(result.rate, result.satoshis, 0, 0),
      currency: req.params.currency
    });
  });
};



/**
 * trade
 * need to add in a UID for this trade
 */
var trade = function(req, res) {
  api.trade.trade(req.body.fiat, req.body.satoshis, req.body.currency, function(err) {
    res.json({err: err});
  });
};



/**
 * send Bitcoins
 */
var send = function(req, res) {
  api.send.sendBitcoins(req.body.address, req.body.satoshis, function(err) {
    res.json({err: err});
  });
};



/**
 * Balance
 */
var balance = function(req, res) {
  api.balance.balance(function(err, results) {
    res.json({err: err, results: results});
  });
};



/**
 * initialize the api routes and attach to the express application object
 */
exports.init = function(app, config, mode) {
  _config = config;

  api.init(_config.exchanges);

  // if ('local' === mode) {
  //   testMode.enable(api);
  // }
  // else if ('heroku' === mode) {
  //   herokuTest.enable(api);
  // }

  exports._tradeExchange = api._tradeExchange;
  exports._transferExchange = api._transferExchange;

  app.get('/poll/:currency', poll);
  app.post('/trade', trade);
  app.post('/send', send);
  return app;
};

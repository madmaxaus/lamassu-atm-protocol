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
var async = require('async');
var _config;
var _lamassuConfig;
var commission;

Error.prototype.toJSON = function () {
  var self = this;
  var ret = {};
  Object.getOwnPropertyNames(self).forEach(function (key) {
    ret[key] = self[key];
  });
  return ret;
};

/**
 * read ticker
 * read ticker value from memory, if ticker counter has expired then re-fetch
 */
var poll = function(req, res) {
  async.parallel({
    rate: api.ticker.rate.bind(api.ticker, req.params.currency),
    satoshis: api.balance.balance.bind(api.balance)
  }, function(err, result) {
    if (err)
      return res.json({err: err})

    res.json({
      err: null,
      rate: result.rate * commission,
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
  api.send.sendBitcoins(req.body.address, req.body.satoshis, function(err, results) {
    res.json({err: err, results: results});
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
 * Configurations
 */
var configurations = function(req, res) {
  res.json({
    err: _config.exchanges && _config.exchanges.settings ? null : new Error('Settings Not Found!'),
    results: _config.exchanges.settings
  });
};

/**
 * Pairing with the device
 */
var pair = function(req, res) {
  var token = req.body.token;
  var name = req.body.name;

  _lamassuConfig.pair(
    token,
    req.connection.getPeerCertificate().fingerprint,
    name,
    function(err) {
      if (err) res.json(500, { err: err });
      else res.json(200);
    }
  );
};



/**
 * initialize the api routes and attach to the express application object
 */
exports.init = function(app, config, lamassuConfig, authMiddleware) {
  _config = config;
  _lamassuConfig = lamassuConfig;

  api.init(_config.exchanges);

  commission = _config.exchanges.settings.commission;

  exports._tradeExchange = api._tradeExchange;
  exports._transferExchange = api._transferExchange;

  app.get('/poll/:currency', authMiddleware, poll);
  app.get('/config', authMiddleware, configurations);
  app.post('/trade', authMiddleware, trade);
  app.post('/send', authMiddleware, send);
  app.post('/pair', pair);
  return app;
};

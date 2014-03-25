'use strict';

var api = exports.api = require('./api/api');
var _config;
var _lamassuConfig;
var _commission;

Error.prototype.toJSON = function () {
  var self = this;
  var ret = {};
  Object.getOwnPropertyNames(self).forEach(function (key) {
    ret[key] = self[key];
  });
  return ret;
};

var poll = function(req, res) {
  var rate = api.ticker.rate(req.params.currency);
  var satoshiBalance = api.balance.balance();
  res.json({
    err: null,
    rate: rate * _commission,
    fiat: api.fiatBalance(rate, satoshiBalance, 0, 0),
    currency: req.params.currency,
    txLimit: _lamassuConfig.txLimit()
  });
};

// TODO need to add in a UID for this trade
var trade = function(req, res) {
  api.trade.trade(req.body.fiat, req.body.satoshis, req.body.currency, function(err) {
    res.json({err: err});
  });
};

var send = function(req, res) {
  var fingerprint = req.connection.getPeerCertificate().fingerprint;
  api.send.sendBitcoins(fingerprint, req.body, function(err, txHash) {
    res.json({err: err, txHash: txHash});
  });
};

var configurations = function(req, res) {
  res.json({
    err: _config.exchanges && _config.exchanges.settings ? null : new Error('Settings Not Found!'),
    results: _config.exchanges.settings
  });
};

var pair = function(req, res) {
  var token = req.body.token;
  var name = req.body.name;

  _lamassuConfig.pair(
    token,
    req.connection.getPeerCertificate().fingerprint,
    name,
    function(err) {
      if (err) res.json(500, { err: err.message });
      else res.json(200);
    }
  );
};

exports.init = function(app, config, lamassuConfig, authMiddleware) {
  _config = config;
  _lamassuConfig = lamassuConfig;

  api.init(_config.exchanges);

  _commission = _config.exchanges.settings.commission;

  exports._tradeExchange = api._tradeExchange;
  exports._transferExchange = api._transferExchange;

  app.get('/poll/:currency', authMiddleware, poll);
  app.get('/config', authMiddleware, configurations);
  app.post('/trade', authMiddleware, trade);
  app.post('/send', authMiddleware, send);
  app.post('/pair', pair);
  return app;
};

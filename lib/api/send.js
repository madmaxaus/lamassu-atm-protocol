'use strict';

var _transferExchange;
var _api;
var _config;
var _db = require('../db/postgresql_interface');

exports.init = function(config, api, transferExchange) {
  _api = api;
  _config = config;
  _transferExchange = transferExchange;
};

exports.setDomain = function(domain) {
  _transferExchange.setDomain(domain);
};

exports.sendBitcoins = function(deviceId, tx, cb) {
  _db.summonTransaction(deviceId, tx, function (err, isNew, txHash) {
    if (err) return cb(err);
    if (isNew) return _transferExchange.sendBitcoins(tx.toAddress, tx.satoshis, 
          _config.settings.transactionFee, function(err, txHash) {
        cb(err, txHash);
        _api.balanceTrigger();
      });

    // txHash might be null, in which case ATM should continue polling  
    cb(null, txHash);
  });
};
